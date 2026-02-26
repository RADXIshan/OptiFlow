import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Activity, LayoutDashboard, Settings } from 'lucide-react';
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
        <p className="text-zinc-500 text-sm mt-1">RL Traffic Optimizer</p>
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

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Navigation />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-10">
          <h2 className="text-lg font-semibold text-zinc-200">System Overview</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-sm text-zinc-400">
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