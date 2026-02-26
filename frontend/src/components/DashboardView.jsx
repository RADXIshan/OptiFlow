import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Car, Clock, ShieldAlert } from 'lucide-react';

export default function DashboardView({ state }) {
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

  // Transform lane data into chart format
  const laneChartData = Object.keys(state.lanes || {}).map(lane => ({
    name: lane.replace('_', ' '),
    queueSize: state.lanes[lane].length
  }));

  // Mock historical data for the line chart (in a real app, we'd accumulate this state hook side)
  const historyData = [
    { time: '10s', wait: Math.random() * 10 + 5 },
    { time: '8s', wait: Math.random() * 10 + 5 },
    { time: '6s', wait: Math.random() * 10 + 5 },
    { time: '4s', wait: Math.random() * 10 + 5 },
    { time: '2s', wait: Math.random() * 10 + 5 },
    { time: 'Now', wait: parseFloat(avgWaitTime) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Vehicles" 
          value={totalVehicles} 
          icon={<Car className="text-blue-400" />} 
          trend="+12% from avg"
        />
        <MetricCard 
          title="Avg Queue Wait" 
          value={`${avgWaitTime}s`} 
          icon={<Clock className="text-amber-400" />} 
          trend="-2.4s vs baseline"
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
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Line type="monotone" dataKey="wait" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, subtitle }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-2 -translate-y-2 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 64 })}
      </div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {trend && <p className="text-emerald-400 text-xs mt-2 font-medium bg-emerald-400/10 inline-block px-2 py-0.5 rounded">{trend}</p>}
          {subtitle && <p className="text-zinc-500 text-xs mt-2">{subtitle}</p>}
        </div>
        <div className="p-2 bg-zinc-800/50 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}
