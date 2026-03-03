import React, { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Activity, LayoutDashboard, Settings, Car, Clock, Timer, Info, Menu, X, Sun, Moon, Bell } from 'lucide-react';
import SimulationView from './components/SimulationView';
import DashboardView  from './components/DashboardView';
import Controls       from './components/Controls';
import AboutView      from './components/AboutView';
import { useSimulationSocket } from './hooks/useSimulationSocket';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Alert count hook ──────────────────────────────────────────────────────────
function useAlertCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch_ = () =>
      fetch(`${API_BASE}/api/alerts`)
        .then(r => r.json())
        .then(d => setCount((d.alerts || []).length))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 3000);
    return () => clearInterval(id);
  }, []);
  return count;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function Navigation({ isOpen, onClose, alertCount }) {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path
      ? 'bg-zinc-800 text-white'
      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50';

  const navItems = [
    { path: '/',           label: 'Dashboard',       icon: <LayoutDashboard size={20} /> },
    { path: '/simulation', label: 'Live Simulation',  icon: <Activity size={20} /> },
    { path: '/controls',   label: 'AI Controls',      icon: <Settings size={20} /> },
    { path: '/about',      label: 'About',            icon: <Info size={20} /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}

      <nav className={`
        fixed lg:static top-0 left-0 z-40 h-screen w-64 bg-zinc-950 border-r border-zinc-900
        flex flex-col transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <Activity className="text-blue-500" />
              OptiFlow
            </h1>
            <p className="text-zinc-500 text-sm mt-1">Traffic Optimizer</p>
          </div>
          <button className="lg:hidden text-zinc-500 hover:text-white p-1" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 space-y-1">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${isActive(path)}`}
            >
              {icon}
              <span>{label}</span>
              {/* Alert badge on Dashboard */}
              {path === '/' && alertCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {Math.min(alertCount, 9)}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-900 text-xs text-zinc-600 text-center">
          OptiFlow v2.0 · RL Traffic AI
        </div>
      </nav>
    </>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
function MainLayout() {
  const { simulationState, isConnected } = useSimulationSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('optiflow_theme') !== 'light');
  const alertCount = useAlertCount();

  // Apply dark/light mode class to document root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('optiflow_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const getPageTitle = (path) => {
    switch (path) {
      case '/':           return 'Dashboard Analytics';
      case '/simulation': return 'Live Traffic Simulation';
      case '/controls':   return 'AI Model Controls';
      case '/about':      return 'About OptiFlow';
      default:            return 'System Overview';
    }
  };

  const metrics = useMemo(() => {
    if (!simulationState) return null;
    const vehicles = simulationState.vehicles || [];
    const total = vehicles.length;
    const totalWait = vehicles.reduce((a, v) => a + v.wait_time * 0.8, 0);
    return {
      step: simulationState.step || 0,
      totalVehicles: total,
      avgWaitTime: total > 0 ? (totalWait / total).toFixed(1) : 0,
      speed: simulationState.speed || 1.0,
    };
  }, [simulationState]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
      <Navigation isOpen={navOpen} onClose={() => setNavOpen(false)} alertCount={alertCount} />

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-4 sm:px-8 bg-zinc-950/50 backdrop-blur-md z-10 shrink-0 gap-4">
          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden text-zinc-400 hover:text-white p-1 shrink-0"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="text-lg font-semibold text-zinc-200 tracking-tight truncate">
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            {/* Live metrics strip */}
            {isConnected && metrics && (
              <div className="hidden lg:flex items-center gap-4 text-sm border-r border-zinc-800 pr-6">
                <Pill icon={<Timer size={13} className="text-blue-400" />} label="Time" value={`${metrics.step}s`} valueClass="text-emerald-400" />
                <Pill icon={<Car size={13} className="text-blue-400" />} label="Active" value={metrics.totalVehicles} />
                <Pill icon={<Clock size={13} className="text-amber-400" />} label="Avg Wait" value={`${metrics.avgWaitTime}s`} />
                {metrics.speed !== 1.0 && (
                  <Pill icon={<Activity size={13} className="text-purple-400" />} label="Speed" value={`${metrics.speed}×`} valueClass="text-purple-300" />
                )}
              </div>
            )}

            {/* Alert bell (mobile shortcut to dashboard) */}
            {alertCount > 0 && (
              <button
                className="relative lg:hidden"
                onClick={() => { navigate('/'); setNavOpen(false); }}
              >
                <Bell size={20} className="text-zinc-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {Math.min(alertCount, 9)}
                </span>
              </button>
            )}

            {/* Dark/Light toggle */}
            <button
              onClick={() => setDarkMode(d => !d)}
              className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-zinc-700/50"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-sm font-medium text-zinc-400 hidden sm:block">
                {isConnected ? 'System Online' : 'Connecting...'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-black to-black pointer-events-none -z-10" />
          <Routes>
            <Route path="/"           element={<DashboardView  state={simulationState} />} />
            <Route path="/simulation" element={<SimulationView state={simulationState} />} />
            <Route path="/controls"   element={<Controls       state={simulationState} />} />
            <Route path="/about"      element={<AboutView />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ── Small pill badge for header ────────────────────────────────────────────────
function Pill({ icon, label, value, valueClass = 'text-zinc-100' }) {
  return (
    <div className="flex items-center gap-1.5 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800/80">
      {icon}
      <span className="text-zinc-400">{label}</span>
      <span className={`font-mono font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { fontSize: '1rem', padding: '1rem', minWidth: '300px' },
        }}
      />
      <MainLayout />
    </BrowserRouter>
  );
}