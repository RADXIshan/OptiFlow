import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Activity, Car, Clock, ShieldAlert, AlertTriangle, Info, X,
  Download, Bell, CheckCircle, Cpu, Wind, Timer, TrendingUp
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(history) {
  if (!history.length) return;
  const header = ['Time', 'Elapsed (s)', 'Vehicles', 'Ambulances', 'Avg Wait (s)', 'Max Wait (s)', 'Congestion', 'Actual CO2 (kg)', 'Worst-Case CO2 (kg)', 'Optimal CO2 (kg)', 'CO2 Saved (kg)'];
  const rows = history.map(h => [
    h.time, h.elapsed, h.vehicles, h.ambulances,
    h.wait, h.maxWait, h.congestion,
    h.actualCO2, h.badCO2, h.goodCO2,
    parseFloat((h.badCO2 - h.actualCO2).toFixed(3)),
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `optiflow_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Alert icon helper ─────────────────────────────────────────────────────────
function AlertIcon({ type, size = 14 }) {
  if (type === 'ambulance') return <ShieldAlert size={size} className="text-red-400 shrink-0" />;
  if (type === 'congestion') return <AlertTriangle size={size} className="text-amber-400 shrink-0" />;
  if (type === 'scenario') return <Activity size={size} className="text-purple-400 shrink-0" />;
  return <Info size={size} className="text-blue-400 shrink-0" />;
}

// ── Session Stats ─────────────────────────────────────────────────────────────
function useSessionStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const fetch_ = () =>
      fetch(`${API_BASE}/api/stats/session`)
        .then(r => r.json())
        .then(setStats)
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, []);
  return stats;
}

// ── Alerts Feed ───────────────────────────────────────────────────────────────
function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    const fetch_ = () =>
      fetch(`${API_BASE}/api/alerts`)
        .then(r => r.json())
        .then(d => setAlerts(d.alerts || []))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 2000);
    return () => clearInterval(id);
  }, []);
  return alerts;
}

function formatUptime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardView({ state }) {
  const [history, setHistory] = useState([]);
  const simStartRef = useRef(null); // wall-clock ms when sim step first > 0
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('city');
  const [selectedCrossroad, setSelectedCrossroad] = useState('0_0');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  const sessionStats = useSessionStats();
  const alerts = useAlerts();

  // previous alerts length to show badge
  const prevAlertLen = useRef(0);
  const hasNewAlert = alerts.length > prevAlertLen.current;
  useEffect(() => { prevAlertLen.current = alerts.length; }, [alerts]);

  useEffect(() => {
    if (!state) return;
    if (state.step === 0 && history.length > 0) { setHistory([]); simStartRef.current = null; return; }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });

    // Track elapsed seconds from first non-zero step
    if (state.step > 0 && simStartRef.current === null) simStartRef.current = Date.now();
    const elapsed = simStartRef.current ? parseFloat(((Date.now() - simStartRef.current) / 1000).toFixed(1)) : 0;

    const validVehicles = viewMode === 'city'
      ? (state.vehicles || [])
      : (state.grid?.[selectedCrossroad] ? Object.values(state.grid[selectedCrossroad].lanes).flat() : []);

    const totalVehicles = validVehicles.length;
    const ambulanceCount = validVehicles.filter(v => v.type === 'ambulance').length;
    const totalWaitTime = validVehicles.reduce((a, v) => a + v.wait_time * 0.8, 0);
    const avgWaitTime = totalVehicles > 0 ? parseFloat((totalWaitTime / totalVehicles).toFixed(1)) : 0;
    const maxWaitTime = totalVehicles > 0 ? parseFloat((Math.max(...validVehicles.map(v => v.wait_time)) * 0.8).toFixed(1)) : 0;
    const actualEmissions = totalWaitTime * 0.00025;
    const badEmissions    = totalVehicles * 90 * 0.00025;
    const goodEmissions   = totalVehicles * 15 * 0.00025;
    const congestionLabel = (totalVehicles > 30 || maxWaitTime > 80) ? 'Severe'
      : (totalVehicles > 15 || maxWaitTime > 40) ? 'Moderate' : 'Low';

    setHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1].step === state.step && prev[prev.length - 1].view === viewMode + selectedCrossroad) return prev;
      const pt = {
        time: timeStr, elapsed, wait: avgWaitTime, maxWait: maxWaitTime,
        vehicles: totalVehicles, ambulances: ambulanceCount,
        step: state.step, view: viewMode + selectedCrossroad,
        congestion: congestionLabel,
        actualCO2: parseFloat(actualEmissions.toFixed(3)),
        badCO2:    parseFloat(badEmissions.toFixed(3)),
        goodCO2:   parseFloat(goodEmissions.toFixed(3)),
      };
      const filtered = prev.filter(p => p.view === pt.view);
      const next = [...filtered, pt];
      return next.length > 20 ? next.slice(next.length - 20) : next;
    });
  }, [state, viewMode, selectedCrossroad]);

  const validVehicles = useMemo(() => {
    if (!state) return [];
    return viewMode === 'city'
      ? (state.vehicles || [])
      : (state.grid?.[selectedCrossroad] ? Object.values(state.grid[selectedCrossroad].lanes).flat() : []);
  }, [state, viewMode, selectedCrossroad]);

  const vehicleTypeDistribution = useMemo(() => {
    if (!validVehicles.length) return [];
    const counts = validVehicles.reduce((a, v) => { a[v.type] = (a[v.type] || 0) + 1; return a; }, {});
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).filter(i => i.value > 0);
  }, [validVehicles]);

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-4 border-zinc-800 border-t-blue-500 animate-spin" />
          <p>Waiting for telemetry...</p>
        </div>
      </div>
    );
  }

  const totalVehicles = validVehicles.length;
  const ambulances    = validVehicles.filter(v => v.type === 'ambulance').length;
  const totalWaitTime = validVehicles.reduce((a, v) => a + v.wait_time * 0.8, 0);
  const avgWaitTime   = totalVehicles > 0 ? parseFloat((totalWaitTime / totalVehicles).toFixed(1)) : 0;
  const maxWaitTime   = totalVehicles > 0 ? parseFloat((Math.max(...validVehicles.map(v => v.wait_time)) * 0.8).toFixed(1)) : 0;

  const phaseDescriptions = {
    0: 'N-S Green (Straight/Right)', 1: 'N-S Green (Left Turn)',
    2: 'E-W Green (Straight/Right)', 3: 'E-W Green (Left Turn)',
  };

  const laneTotals = {};
  if (state.grid) {
    if (viewMode === 'city') {
      Object.values(state.grid).forEach(inter => {
        Object.entries(inter.lanes).forEach(([lane, q]) => { laneTotals[lane] = (laneTotals[lane] || 0) + q.length; });
      });
    } else if (state.grid[selectedCrossroad]) {
      Object.entries(state.grid[selectedCrossroad].lanes).forEach(([lane, q]) => { laneTotals[lane] = (laneTotals[lane] || 0) + q.length; });
    }
  }
  const laneChartData = Object.keys(laneTotals).map(lane => ({ name: lane.replace('_', ' '), queueSize: laneTotals[lane] }));

  const COLORS = { Car: '#3b82f6', Truck: '#8b5cf6', Bus: '#f59e0b', Bike: '#ec4899', Ambulance: '#ef4444' };

  const filteredHistory = history.filter(h => h.view === viewMode + selectedCrossroad);
  let vehicleTrend = 0, waitTrend = 0, maxWaitTrend = 0;
  if (filteredHistory.length > 1) {
    vehicleTrend = totalVehicles - filteredHistory.reduce((a, c) => a + c.vehicles, 0) / filteredHistory.length;
    waitTrend    = avgWaitTime - filteredHistory.reduce((a, c) => a + c.wait, 0) / filteredHistory.length;
    maxWaitTrend = maxWaitTime - filteredHistory.reduce((a, c) => a + c.maxWait, 0) / filteredHistory.length;
  }

  const trendStr = (t, unit = '') => filteredHistory.length > 1 ? (t >= 0 ? `+${t.toFixed(1)}${unit} vs avg` : `${t.toFixed(1)}${unit} vs avg`) : 'Gathering data...';
  const trendClr = (t) => t > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';

  let currentDisplayHistory = [...filteredHistory];
  if (!currentDisplayHistory.length) {
    currentDisplayHistory = [{
      time: new Date().toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit' }),
      wait: avgWaitTime, maxWait: maxWaitTime, vehicles: totalVehicles,
      actualCO2: parseFloat((totalWaitTime * 0.00025).toFixed(3)),
      badCO2:    parseFloat((totalVehicles * 90 * 0.00025).toFixed(3)),
      goodCO2:   parseFloat((totalVehicles * 15 * 0.00025).toFixed(3)),
    }];
  }

  let congestionLevel = 'Low', congestionColor = 'text-emerald-400';
  if (totalVehicles > 30 || maxWaitTime > 80) { congestionLevel = 'Severe'; congestionColor = 'text-red-500 animate-pulse'; }
  else if (totalVehicles > 15 || maxWaitTime > 40) { congestionLevel = 'Moderate'; congestionColor = 'text-amber-400'; }

  const coords = Object.keys(state.grid || {});

  return (
    <div className="space-y-6">

      {/* ── Session Stats Bar ─────────────────────────────────────────────── */}
      {sessionStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Vehicles Cleared', value: sessionStats.total_vehicles_cleared.toLocaleString(), icon: <CheckCircle size={15} className="text-emerald-400" /> },
            { label: 'CO₂ Saved', value: `${sessionStats.co2_saved_kg} kg`, icon: <Wind size={15} className="text-green-400" /> },
            { label: 'Efficiency Score', value: `${sessionStats.efficiency_score}%`, icon: <TrendingUp size={15} className="text-blue-400" /> },
            { label: 'Session Uptime', value: formatUptime(sessionStats.uptime_seconds), icon: <Timer size={15} className="text-purple-400" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="p-1.5 bg-zinc-800 rounded-lg">{icon}</div>
              <div>
                <p className="text-zinc-500 text-xs">{label}</p>
                <p className="text-zinc-100 font-mono font-semibold text-sm">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View Scope Selector ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
        <div>
          <h2 className="text-xl font-bold text-white">Metrics Scope</h2>
          <p className="text-zinc-500 text-sm">Filter realtime analytics by node</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {['city', 'crossroad'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >
                {mode === 'city' ? 'City Average' : 'Specific Crossroad'}
              </button>
            ))}
          </div>
          {viewMode === 'crossroad' && (
            <select
              value={selectedCrossroad}
              onChange={e => setSelectedCrossroad(e.target.value)}
              className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {coords.map(k => <option key={k} value={k}>Intersection {k.replace('_', ',')}</option>)}
            </select>
          )}
          {/* CSV Export */}
          <button
            onClick={() => exportCSV(filteredHistory)}
            disabled={!filteredHistory.length}
            title="Export history as CSV"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all text-sm border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
          {/* Alerts toggle */}
          <button
            onClick={() => setIsAlertsOpen(o => !o)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all text-sm border border-zinc-700"
          >
            <Bell size={14} />
            Alerts
            {alerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {Math.min(alerts.length, 9)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Alerts Panel ──────────────────────────────────────────────────── */}
      {isAlertsOpen && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Bell size={14} className="text-red-400" /> Live Event Log
            </h3>
            <button onClick={() => setIsAlertsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/60">
            {alerts.length === 0 ? (
              <p className="text-zinc-500 text-sm p-4 text-center">No events yet</p>
            ) : alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors">
                <AlertIcon type={a.type} size={13} />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 text-xs leading-snug">{a.message}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">{new Date(a.ts * 1000).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Metric Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <MetricCard title="Active Vehicles" value={totalVehicles} icon={<Car className="text-blue-400" />} trend={trendStr(vehicleTrend)} trendColor={trendClr(vehicleTrend)} />
        <MetricCard title="Avg Queue Wait"  value={`${avgWaitTime}s`} icon={<Clock className="text-amber-400" />} trend={trendStr(waitTrend, 's')} trendColor={trendClr(waitTrend)} />
        <MetricCard title="Max Queue Wait"  value={`${maxWaitTime}s`} icon={<AlertTriangle className="text-red-400" />} trend={trendStr(maxWaitTrend, 's')} trendColor={trendClr(maxWaitTrend)} />
        <MetricCard
          title="Critical Response"
          value={ambulances}
          subtitle="Ambulances Active"
          icon={<ShieldAlert className={ambulances > 0 ? 'text-red-500 animate-pulse' : 'text-zinc-500'} />}
        />
        <MetricCard
          title={`Phase (${viewMode === 'city' ? 'City' : `Node ${selectedCrossroad.replace('_', ',')}`})`}
          value={viewMode === 'crossroad'
            ? (state.grid?.[selectedCrossroad]
                ? (state.grid[selectedCrossroad].is_transitioning ? `Phase ${state.grid[selectedCrossroad].phase} (Yellow)` : `Phase ${state.grid[selectedCrossroad].phase}`)
                : 'N/A')
            : 'City Overview'}
          icon={<Activity className={viewMode === 'crossroad' && state.grid?.[selectedCrossroad]?.is_transitioning ? 'text-amber-400' : 'text-emerald-400'} />}
          subtitle={viewMode === 'crossroad' && state.grid?.[selectedCrossroad]?.is_transitioning
            ? 'Transitioning...'
            : (viewMode === 'crossroad' ? (phaseDescriptions[state.grid?.[selectedCrossroad]?.phase] || 'RL Determined') : 'Multi-Agent Active')}
          onInfoClick={() => setIsPhaseModalOpen(true)}
        />
        <MetricCard title="Congestion Level" value={congestionLevel} icon={<Activity className={congestionColor} />} subtitle="Overall System Status" />
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Queue by Lane */}
        <ChartCard title="Queue Length by Lane">
          <BarChart data={laneChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={itemStyle} />
            <Bar dataKey="queueSize" fill="#3b82f6" radius={[4,4,0,0]} />
          </BarChart>
        </ChartCard>

        {/* Avg & Max Wait */}
        <ChartCard title="Average & Max Wait Time" rightLabel="Seconds">
          <LineChart data={currentDisplayHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={itemStyle} labelStyle={labelStyle} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Line name="Avg Wait" type="monotone" dataKey="wait" stroke="#f59e0b" strokeWidth={3} dot={{ fill:'#f59e0b', r:4 }} isAnimationActive={false} />
            <Line name="Max Wait" type="monotone" dataKey="maxWait" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

        {/* Active Vehicles */}
        <ChartCard title="Active Vehicles" rightLabel="Count">
          <LineChart data={currentDisplayHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={itemStyle} labelStyle={labelStyle} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Line name="Total Vehicles" type="monotone" dataKey="vehicles" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6', r:4 }} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

        {/* Vehicle Distribution */}
        <ChartCard title="Vehicle Distribution">
          <div className="h-80 flex items-center justify-center">
            {vehicleTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={vehicleTypeDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                    {vehicleTypeDistribution.map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#8884d8'} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={itemStyle} />
                  <Legend iconType="circle" verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-zinc-500 flex flex-col items-center justify-center h-full">
                <Car size={32} className="mb-2 opacity-50" />
                No vehicles on road
              </div>
            )}
          </div>
        </ChartCard>

        {/* CO2 Emissions */}
        <ChartCard title="Real-Time CO₂ Emissions" rightLabel="Actual vs Baselines (kg CO₂)" wide>
          <LineChart data={currentDisplayHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} itemStyle={itemStyle} labelStyle={labelStyle} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Line name="Actual Emissions (RL)"         type="monotone" dataKey="actualCO2" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6', r:4 }} isAnimationActive={false} />
            <Line name="Poor Traffic Flow (Real-life)" type="monotone" dataKey="badCO2"    stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
            <Line name="Optimal Flow (Real-life)"      type="monotone" dataKey="goodCO2"   stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartCard>

      </div>

      {/* ── Phase Modal ──────────────────────────────────────────────────────── */}
      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setIsPhaseModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Activity className="text-blue-400" size={24} /></div>
              <h2 className="text-xl font-bold text-white">Traffic Light Phases</h2>
            </div>
            <p className="text-zinc-400 text-sm mb-4">The RL agent dynamically switches between 4 possible traffic light combinations to optimise intersection flow.</p>
            <div className="space-y-3">
              {Object.entries(phaseDescriptions).map(([phase, desc]) => (
                <div key={phase} className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-4 items-center">
                  <div className="text-emerald-400 font-mono font-bold text-lg bg-emerald-400/10 w-10 h-10 flex items-center justify-center rounded-lg">{phase}</div>
                  <p className="text-zinc-200 font-medium text-sm">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
              <button onClick={() => setIsPhaseModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared chart styles ───────────────────────────────────────────────────────
const tooltipStyle = { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' };
const itemStyle    = { color: '#e4e4e7' };
const labelStyle   = { color: '#a1a1aa', marginBottom: '8px' };

function ChartCard({ title, rightLabel, wide, children }) {
  return (
    <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="text-lg font-medium text-zinc-200 mb-6 flex justify-between items-center">
        {title}
        {rightLabel && <span className="text-xs text-zinc-500 font-normal">{rightLabel}</span>}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendColor = 'text-emerald-400 bg-emerald-400/10', subtitle, onInfoClick }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 64 })}
      </div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-zinc-400 text-sm font-medium">{title}</p>
            {onInfoClick && (
              <button onClick={onInfoClick} className="text-zinc-500 hover:text-blue-400 transition-colors p-0.5 rounded-full hover:bg-blue-400/10" title="View Details">
                <Info size={14} />
              </button>
            )}
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {trend    && <p className={`text-xs mt-2 font-medium inline-block px-2 py-0.5 rounded ${trendColor}`}>{trend}</p>}
          {subtitle && <p className="text-zinc-500 text-xs mt-2">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-800/50 rounded-lg">{icon}</div>
      </div>
    </div>
  );
}
