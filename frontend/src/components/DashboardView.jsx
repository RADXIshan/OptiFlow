import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, Car, Clock, ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

export default function DashboardView({ state }) {
  const [history, setHistory] = useState([]);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);

  useEffect(() => {
    if (!state) return;
    
    // Check if we restarted step from 0
    if (state.step === 0 && history.length > 0) {
      setHistory([]);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });

    const totalVehicles = state.vehicles?.length || 0;
    const totalWaitTime = state.vehicles?.reduce((acc, v) => acc + (v.wait_time * 0.8), 0) || 0;
    const avgWaitTime = totalVehicles > 0 ? parseFloat((totalWaitTime / totalVehicles).toFixed(1)) : 0;
    const maxWaitTime = totalVehicles > 0 ? parseFloat((Math.max(...state.vehicles.map(v => v.wait_time)) * 0.8).toFixed(1)) : 0;

    const actualEmissions = totalWaitTime * 0.00025;
    const badEmissions = totalVehicles * 90 * 0.00025;
    const goodEmissions = totalVehicles * 15 * 0.00025;

    setHistory(prev => {
      // Avoid duplicate points for the same step (just simpler)
      if (prev.length > 0 && prev[prev.length - 1].step === state.step) {
         return prev;
      }
      const newPoint = { 
        time: timeStr, 
        wait: parseFloat(avgWaitTime), 
        maxWait: maxWaitTime,
        vehicles: totalVehicles, 
        step: state.step,
        actualCO2: parseFloat(actualEmissions.toFixed(3)),
        badCO2: parseFloat(badEmissions.toFixed(3)),
        goodCO2: parseFloat(goodEmissions.toFixed(3))
      };
      const newData = [...prev, newPoint];
      if (newData.length > 20) return newData.slice(newData.length - 20);
      return newData;
    });
  }, [state]);

  const vehicleTypeDistribution = useMemo(() => {
    if (!state || !state.vehicles) return [];
    
    // Count different types
    const counts = state.vehicles.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});
    
    // Filter out 0 count and format for PieChart
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .filter(item => item.value > 0);
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
  
  const totalWaitTime = state.vehicles?.reduce((acc, v) => acc + (v.wait_time * 0.8), 0) || 0;
  const avgWaitTime = totalVehicles > 0 ? parseFloat((totalWaitTime / totalVehicles).toFixed(1)) : 0;
  const maxWaitTime = totalVehicles > 0 ? parseFloat((Math.max(...state.vehicles.map(v => v.wait_time)) * 0.8).toFixed(1)) : 0;

  const phaseDescriptions = {
    0: "N-S Green (Straight/Right)",
    1: "N-S Green (Left Turn)",
    2: "E-W Green (Straight/Right)",
    3: "E-W Green (Left Turn)",
  };

  const laneChartData = Object.keys(state.lanes || {}).map(lane => ({
    name: lane.replace('_', ' '),
    queueSize: state.lanes[lane].length
  }));

  const COLORS = {
    'Car': '#3b82f6', // blue
    'Truck': '#8b5cf6', // purple
    'Bus': '#f59e0b', // amber
    'Bike': '#ec4899', // pink
    'Ambulance': '#ef4444' // red
  };

  let vehicleTrend = 0;
  let waitTrend = 0;
  let maxWaitTrend = 0;
  if (history.length > 1) {
    const avgVehiclesHistory = history.reduce((acc, curr) => acc + curr.vehicles, 0) / history.length;
    vehicleTrend = totalVehicles - avgVehiclesHistory;

    const avgWaitHistory = history.reduce((acc, curr) => acc + curr.wait, 0) / history.length;
    waitTrend = avgWaitTime - avgWaitHistory;

    const avgMaxWaitHistory = history.reduce((acc, curr) => acc + curr.maxWait, 0) / history.length;
    maxWaitTrend = maxWaitTime - avgMaxWaitHistory;
  }

  const vehicleTrendStr = history.length > 1 ? (vehicleTrend >= 0 ? `+${vehicleTrend.toFixed(1)} from avg` : `${vehicleTrend.toFixed(1)} from avg`) : 'Gathering data...';
  const waitTrendStr = history.length > 1 ? (waitTrend >= 0 ? `+${waitTrend.toFixed(1)}s vs avg` : `${waitTrend.toFixed(1)}s vs avg`) : 'Gathering data...';
  const maxWaitTrendStr = history.length > 1 ? (maxWaitTrend >= 0 ? `+${maxWaitTrend.toFixed(1)}s vs avg` : `${maxWaitTrend.toFixed(1)}s vs avg`) : 'Gathering data...';
  
  const vehicleTrendColor = vehicleTrend > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
  const waitTrendColor = waitTrend > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';
  const maxWaitTrendColor = maxWaitTrend > 0 ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10';

  let currentDisplayHistory = [...history];
  if (currentDisplayHistory.length === 0) {
      const now = new Date();
      const minutes = now.getMinutes();
      const roundedMinutes = minutes - (minutes % 5);
      const bucketTime = new Date(now);
      bucketTime.setMinutes(roundedMinutes);
      bucketTime.setSeconds(0);
      
      const actualEmissions = totalWaitTime * 0.00025;
      const badEmissions = totalVehicles * 90 * 0.00025;
      const goodEmissions = totalVehicles * 15 * 0.00025;

      currentDisplayHistory = [{ 
        time: bucketTime.toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit' }), 
        wait: parseFloat(avgWaitTime), 
        maxWait: maxWaitTime, 
        vehicles: totalVehicles,
        actualCO2: parseFloat(actualEmissions.toFixed(3)),
        badCO2: parseFloat(badEmissions.toFixed(3)),
        goodCO2: parseFloat(goodEmissions.toFixed(3))
      }];
  }

  // Calculate generic congestion level
  let congestionLevel = "Low";
  let congestionColor = "text-emerald-400";
  if (totalVehicles > 30 || maxWaitTime > 80) {
     congestionLevel = "Severe";
     congestionColor = "text-red-500 animate-pulse";
  } else if (totalVehicles > 15 || maxWaitTime > 40) {
     congestionLevel = "Moderate";
     congestionColor = "text-amber-400";
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          title="Max Queue Wait" 
          value={`${maxWaitTime}s`} 
          icon={<AlertTriangle className="text-red-400" />} 
          trend={maxWaitTrendStr}
          trendColor={maxWaitTrendColor}
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
          subtitle={phaseDescriptions[state.phase] || "RL Determined"}
          onInfoClick={() => setIsPhaseModalOpen(true)}
        />
        <MetricCard 
          title="Congestion Level" 
          value={congestionLevel} 
          icon={<Activity className={congestionColor} />} 
          subtitle="Overall System Status"
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

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm lg:col-span-1">
          <h3 className="text-lg font-medium text-zinc-200 mb-6 flex justify-between items-center">
             Average vs Max Wait Time Trend 
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentDisplayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                <Line name="Avg Wait (s)" type="monotone" dataKey="wait" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} isAnimationActive={false} />
                <Line name="Max Wait (s)" type="monotone" dataKey="maxWait" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm lg:col-span-1">
          <h3 className="text-lg font-medium text-zinc-200 mb-6 flex justify-between items-center">
             Active Vehicles Pipeline
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentDisplayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                />
                <Line name="Vehicles" type="monotone" dataKey="vehicles" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-medium text-zinc-200 mb-6">Vehicle Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            {vehicleTypeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vehicleTypeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {vehicleTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#e4e4e7' }}
                    itemStyle={{ color: '#e4e4e7' }}
                  />
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
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm lg:col-span-2">
          <h3 className="text-lg font-medium text-zinc-200 mb-6 flex justify-between items-center">
             Real-Time CO2 Emissions 
             <span className="text-xs text-zinc-500 font-normal">Actual vs Real-life Baselines (kg CO2)</span>
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={currentDisplayHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                  labelStyle={{ color: '#a1a1aa', marginBottom: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                <Line name="Actual Emissions (RL)" type="monotone" dataKey="actualCO2" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} isAnimationActive={false} />
                <Line name="Poor Traffic Flow (Real-life)" type="monotone" dataKey="badCO2" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line name="Optimal Traffic Flow (Real-life)" type="monotone" dataKey="goodCO2" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {isPhaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsPhaseModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="text-blue-400" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Traffic Light Phases</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-zinc-400 text-sm mb-2">
                The RL agent dynamically switches between 4 possible traffic light combinations to optimize intersection flow.
              </p>
              
              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-4 items-center">
                <div className="text-emerald-400 font-mono font-bold text-lg bg-emerald-400/10 w-10 h-10 flex items-center justify-center rounded-lg">0</div>
                <div>
                  <h4 className="text-zinc-200 font-medium">North-South (Straight/Right)</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">Green light for N/S traffic going straight or turning right.</p>
                </div>
              </div>
              
              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-4 items-center">
                <div className="text-emerald-400 font-mono font-bold text-lg bg-emerald-400/10 w-10 h-10 flex items-center justify-center rounded-lg">1</div>
                <div>
                  <h4 className="text-zinc-200 font-medium">North-South (Left Turn)</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">Green light exclusively for N/S traffic turning left.</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-4 items-center">
                <div className="text-emerald-400 font-mono font-bold text-lg bg-emerald-400/10 w-10 h-10 flex items-center justify-center rounded-lg">2</div>
                <div>
                  <h4 className="text-zinc-200 font-medium">East-West (Straight/Right)</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">Green light for E/W traffic going straight or turning right.</p>
                </div>
              </div>

              <div className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex gap-4 items-center">
                <div className="text-emerald-400 font-mono font-bold text-lg bg-emerald-400/10 w-10 h-10 flex items-center justify-center rounded-lg">3</div>
                <div>
                  <h4 className="text-zinc-200 font-medium">East-West (Left Turn)</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">Green light exclusively for E/W traffic turning left.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setIsPhaseModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendColor = 'text-emerald-400 bg-emerald-400/10', subtitle, tooltip, onInfoClick }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors" title={tooltip}>
      <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 64 })}
      </div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-zinc-400 text-sm font-medium">{title}</p>
            {onInfoClick && (
              <button 
                onClick={onInfoClick}
                className="text-zinc-500 hover:text-blue-400 transition-colors p-0.5 rounded-full hover:bg-blue-400/10 focus:outline-none"
                title="View Details"
              >
                <Info size={14} />
              </button>
            )}
          </div>
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
