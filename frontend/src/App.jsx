import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Activity, LayoutDashboard, Settings, Car, Clock, Timer } from 'lucide-react';
import SimulationView from './components/SimulationView';
import DashboardView from './components/DashboardView';
import Controls from './components/Controls';
import { useSimulationSocket } from './hooks/useSimulationSocket';

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50';

  return (
    <nav className="w-64 bg-zinc-950 border-r border-zinc-900 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
          <Activity className="text-blue-500" />
          OptiFlow
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Traffic Optimizer</p>
      </div>

      <div className="flex-1 px-4 space-y-2">
        <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/')}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/simulation" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/simulation')}`}>
          <Activity size={20} />
          <span>Live Simulation</span>
        </Link>
        <Link to="/controls" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/controls')}`}>
          <Settings size={20} />
          <span>AI Controls</span>
        </Link>
      </div>
    </nav>
  );
}

function MainLayout() {
  const { simulationState, isConnected, error } = useSimulationSocket();
  const location = useLocation();

  const getPageTitle = (path) => {
    switch(path) {
      case '/': return 'Dashboard Analytics';
      case '/simulation': return 'Live Traffic Simulation';
      case '/controls': return 'AI Model Controls';
      default: return 'System Overview';
    }
  };

  const metrics = useMemo(() => {
    if (!simulationState) return null;
    const vehicles = simulationState.vehicles || [];
    const totalVehicles = vehicles.length;
    const totalWaitTime = vehicles.reduce((acc, v) => acc + (v.wait_time * 0.8), 0);
    const avgWaitTime = totalVehicles > 0 ? (totalWaitTime / totalVehicles).toFixed(1) : 0;
    return {
      step: simulationState.step || 0,
      totalVehicles,
      avgWaitTime
    };
  }, [simulationState]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Navigation />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-10 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-200 tracking-tight">{getPageTitle(location.pathname)}</h2>
          <div className="flex items-center gap-6">
            {isConnected && metrics && (
              <div className="hidden lg:flex items-center gap-6 text-sm border-r border-zinc-800 pr-6">
                <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/80">
                  <Timer size={14} className="text-blue-400" />
                  <span className="text-zinc-400">Time</span>
                  <span className="text-emerald-400 font-mono font-medium">{metrics.step}s</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/80">
                  <Car size={14} className="text-blue-400" />
                  <span className="text-zinc-400">Active</span>
                  <span className="text-zinc-100 font-mono font-medium">{metrics.totalVehicles}</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/80">
                  <Clock size={14} className="text-amber-400" />
                  <span className="text-zinc-400">Avg Wait</span>
                  <span className="text-zinc-100 font-mono font-medium">{metrics.avgWaitTime}s</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-sm font-medium text-zinc-400">
                {isConnected ? 'System Online' : 'Connecting Engine...'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none -z-10" />
          
          <Routes>
            <Route path="/" element={<DashboardView state={simulationState} />} />
            <Route path="/simulation" element={<SimulationView state={simulationState} />} />
            <Route path="/controls" element={<Controls state={simulationState} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          style: {
            fontSize: '1.125rem',
            padding: '1.25rem',
            minWidth: '350px'
          },
          className: 'text-lg'
        }}
      />
      <MainLayout />
    </BrowserRouter>
  );
}