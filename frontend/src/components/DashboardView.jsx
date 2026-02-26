import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Car, Clock, ShieldAlert } from 'lucide-react';

export default function DashboardView({ state }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!state) return;
    
    // Check if we restarted step from 0
    if (state.step === 0 && history.length > 0) {
      setHistory([]);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

    const totalVehicles = state.vehicles?.length || 0;
    const totalWaitTime = state.vehicles?.reduce((acc, v) => acc + v.wait_time, 0) || 0;
    const avgWaitTime = totalVehicles > 0 ? (totalWaitTime / totalVehicles).toFixed(1) : 0;

    setHistory(prev => {
      // Avoid duplicate points for the same step (just simpler)
      if (prev.length > 0 && prev[prev.length - 1].step === state.step) {
         return prev;
      }
      const newPoint = { 
        time: timeStr, 
        wait: parseFloat(avgWaitTime), 
        vehicles: totalVehicles, 
        step: state.step 
      };
      const newData = [...prev, newPoint];
      if (newData.length > 20) return newData.slice(newData.length - 20);
      return newData;
    });
  }, [state]);

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

  // Calculate some aggregate metrics
  const totalVehicles = state.vehicles?.length || 0;
  const ambulances = state.vehicles?.filter(v => v.type === 'ambulance').length || 0;
  
  const totalWaitTime = state.vehicles?.reduce((acc, v) => acc + v.wait_time, 0) || 0;
  const avgWaitTime = totalVehicles > 0 ? (totalWaitTime / totalVehicles).toFixed(1) : 0;

  const laneChartData = Object.keys(state.lanes || {}).map(lane => ({
    name: lane.replace('_', ' '),
    queueSize: state.lanes[lane].length
  }));

  let vehicleTrend = 0;
  let waitTrend = 0;
  if (history.length > 1) {
    const avgVehiclesHistory = history.reduce((acc, curr) => acc + curr.vehicles, 0) / history.length;
    vehicleTrend = totalVehicles - avgVehiclesHistory;

    const avgWaitHistory = history.reduce((acc, curr) => acc + curr.wait, 0) / history.length;
    waitTrend = avgWaitTime - avgWaitHistory;
  }

  const vehicleTrendStr = history.length > 1 ? (vehicleTrend >= 0 ? `+${vehicleTrend.toFixed(1)} from avg` : `${vehicleTrend.toFixed(1)} from avg`) : 'Gathering data...';
  const waitTrendStr = history.length > 1 ? (waitTrend >= 0 ? `+${waitTrend.toFixed(1)}s vs avg` : `${waitTrend.toFixed(1)}s vs avg`) : 'Gathering data...';
  
  const vehicleTrendColor = vehicleTrend > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
  const waitTrendColor = waitTrend > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';

  let displayHistory = history.length > 0 ? history : [{ time: 'Now', wait: parseFloat(avgWaitTime) }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Vehicles" 
          value={totalVehicles} 
          icon={<Car className="text-blue-400" />} 
          trend={vehicleTrendStr}
          trendColor={vehicleTrendColor}
        />
        <MetricCard 
          title="Avg Queue Wait" 
          value={`${avgWaitTime}s`} 
          icon={<Clock className="text-amber-400" />} 
          trend={waitTrendStr}
          trendColor={waitTrendColor}
        />
        <MetricCard 
          title="Critical Response" 
          value={ambulances} 
          subtitle="Ambulances Active"
          icon={<ShieldAlert className={ambulances > 0 ? "text-red-500 animate-pulse" : "text-zinc-500"} />} 
        />
        <MetricCard 
          title="Current Phase" 
          value={`Phase ${state.phase}`} 
          icon={<Activity className="text-emerald-400" />} 
          subtitle="RL Determined"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-zinc-200 mb-6">Queue Length by Lane</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={laneChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="queueSize" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-zinc-200 mb-6">Average Wait Time Trend</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Line type="monotone" dataKey="wait" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendColor = 'text-emerald-400 bg-emerald-400/10', subtitle }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 64 })}
      </div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {trend && <p className={`text-xs mt-2 font-medium inline-block px-2 py-0.5 rounded ${trendColor}`}>{trend}</p>}
          {subtitle && <p className="text-zinc-500 text-xs mt-2">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-800/50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}
