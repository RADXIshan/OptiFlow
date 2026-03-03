import React, { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Power, Car, Map, RotateCcw, Gauge, Zap, Moon, Sun, Flame, Siren } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Debounce helper
function useDebounce(fn, delay = 400) {
  const timer = React.useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="text-zinc-400 text-sm mb-6">{subtitle}</p>}
      {!subtitle && <div className="mb-6" />}
      {children}
    </div>
  );
}

export default function Controls({ state }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [density, setDensity] = useState(null); // null = wave default
  const [activeScenario, setActiveScenario] = useState('default');

  // Sync speed & density from WebSocket state (first time or when backend changes)
  useEffect(() => {
    if (state?.speed != null) setSpeed(state.speed);
  }, [state?.speed]);

  useEffect(() => {
    if (state !== undefined) setDensity(state?.density ?? null);
  }, [state?.density]);

  // ── Engine Controls ─────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/start`, { method: 'POST' });
      toast.success('Simulation Engine Started');
    } catch { toast.error('Failed to start engine'); }
  };
  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/stop`, { method: 'POST' });
      toast.error('Simulation Engine Halted');
    } catch { toast.error('Failed to halt engine'); }
  };
  const handleReset = async () => {
    if (state?.is_running) { toast.error("Halt engine before resetting!"); return; }
    try {
      await fetch(`${API_BASE}/api/simulation/reset`, { method: 'POST' });
      toast.info('Environment & session stats reset');
    } catch { toast.error('Failed to reset environment'); }
  };

  // ── Speed Control ───────────────────────────────────────────────────────────
  const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];
  const handleSpeed = async (mult) => {
    setSpeed(mult);
    try {
      await fetch(`${API_BASE}/api/simulation/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: mult }),
      });
      toast.info(`Speed set to ${mult}×`);
    } catch { toast.error('Failed to update speed'); }
  };

  // ── Density Control ─────────────────────────────────────────────────────────
  const postDensity = useDebounce(async (val) => {
    try {
      await fetch(`${API_BASE}/api/simulation/density`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ density: val }),
      });
    } catch { toast.error('Failed to update density'); }
  }, 350);

  const handleDensityChange = (e) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value);
    setDensity(val);
    postDensity(val);
  };
  const handleDensityReset = async () => {
    setDensity(null);
    try {
      await fetch(`${API_BASE}/api/simulation/density`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ density: null }),
      });
      toast.info('Traffic density reset to wave pattern');
    } catch { toast.error('Failed to reset density'); }
  };

  // ── Scenarios ───────────────────────────────────────────────────────────────
  const handleScenario = async (scenario) => {
    setIsUpdating(true);
    setActiveScenario(scenario);
    try {
      await fetch(`${API_BASE}/api/simulation/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      // Sync density display to scenario preset
      const presetDensity = { rush_hour: 0.55, night: 0.04, incident: 0.35, default: null };
      setDensity(presetDensity[scenario]);
      toast.success(`Scenario: ${scenario.replace('_', ' ')} activated`);
    } catch { toast.error('Failed to apply scenario'); }
    finally { setIsUpdating(false); }
  };

  // ── Ambulance / Drive Side ──────────────────────────────────────────────────
  const handleSpawnAmbulance = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traffic_density: 0.1, spawn_ambulance: true }),
      });
      toast.warning('🚨 Emergency Vehicle Injected');
    } catch { toast.error('Failed to spawn vehicle'); }
  };
  const handleDriveSide = async (side) => {
    setIsUpdating(true);
    try {
      await fetch(`${API_BASE}/api/simulation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traffic_density: 0.1, drive_side: side }),
      });
      toast.info(`Switched to ${side}-hand drive`);
    } catch { toast.error('Failed to update drive side'); }
    finally { setIsUpdating(false); }
  };

  const scenarios = [
    { id: 'default', label: 'Default', sub: 'Wave-pattern traffic', icon: <Gauge size={22} className="text-blue-400" />, color: 'blue' },
    { id: 'rush_hour', label: 'Rush Hour', sub: 'Peak congestion load', icon: <Flame size={22} className="text-orange-400" />, color: 'orange' },
    { id: 'night', label: 'Night Time', sub: 'Sparse overnight flow', icon: <Moon size={22} className="text-indigo-400" />, color: 'indigo' },
    { id: 'incident', label: 'Incident', sub: 'Emergency response drill', icon: <Siren size={22} className="text-red-400" />, color: 'red' },
  ];

  const colorMap = {
    blue:   { ring: 'ring-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
    orange: { ring: 'ring-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
    red:    { ring: 'ring-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-1">AI Control Panel</h2>
          <p className="text-zinc-400 text-sm">Manage the RL engine, traffic conditions, and environment.</p>
        </div>
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${state?.is_running ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          <div className={`w-2 h-2 rounded-full ${state?.is_running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-medium text-sm">{state?.is_running ? 'Engine Active' : 'Engine Halted'}</span>
        </div>
      </div>

      {/* Engine Buttons */}
      <SectionCard
        title="Engine Controls"
        subtitle="Start, halt, or reset the reinforcement learning simulation engine."
        icon={<Power size={18} className="text-zinc-400" />}
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Initialize', onClick: handleStart, disabled: state?.is_running, color: 'emerald', icon: <Power size={28} /> },
            { label: 'Halt', onClick: handleStop, disabled: !state?.is_running, color: 'red', icon: <Power size={28} /> },
            { label: 'Reset', onClick: handleReset, disabled: state?.is_running, color: 'blue', icon: <RotateCcw size={28} /> },
          ].map(({ label, onClick, disabled, color, icon }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={disabled}
              className={`flex flex-col items-center justify-center gap-3 py-7 rounded-2xl transition-all group
                ${disabled
                  ? `bg-${color}-500/30 border border-${color}-500/30 cursor-not-allowed opacity-40`
                  : `bg-${color}-500/10 border border-${color}-500/20 hover:border-${color}-500/50`
                }`}
            >
              <div className={`w-14 h-14 rounded-full bg-${color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform text-${color}-400`}>
                {icon}
              </div>
              <span className={`text-${color}-400 font-semibold`}>{label}</span>
            </button>
          ))}
        </div>

      </SectionCard>

      {/* Simulation Speed */}
      <SectionCard
        title="Simulation Speed"
        subtitle="Control tick rate. Higher speeds may reduce visual clarity."
        icon={<Zap size={18} className="text-amber-400" />}
      >
        <div className="flex gap-3 flex-wrap">
          {SPEED_OPTIONS.map((mult) => (
            <button
              key={mult}
              onClick={() => handleSpeed(mult)}
              className={`min-w-18 flex-1 py-3 rounded-xl font-mono font-bold text-sm transition-all border
                ${speed === mult
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
              {mult}×
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Traffic Density */}
      <SectionCard
        title="Traffic Density"
        subtitle="Manually override vehicle spawn rate per step. Wave = natural day-cycle pattern."
        icon={<Car size={18} className="text-blue-400" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Spawn rate</span>
            <span className="font-mono text-blue-400 font-medium">
              {density !== null ? `${Math.round(density * 100)}%` : 'Wave (Auto)'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={density ?? 0.15}
            onChange={handleDensityChange}
            onMouseDown={() => density === null && setDensity(0.15)}
            className="w-full accent-blue-500 cursor-pointer h-2 rounded-lg"
          />
          <div className="flex justify-between text-xs text-zinc-600">
            <span>0% Empty</span>
            <span>100% Max</span>
          </div>
          <button
            onClick={handleDensityReset}
            className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
          >
            Reset to Wave Pattern
          </button>
        </div>
      </SectionCard>

      {/* Scenarios */}
      <SectionCard
        title="Traffic Scenarios"
        subtitle="Instantly apply real-world traffic conditions for testing RL model response."
        icon={<Map size={18} className="text-purple-400" />}
      >
        <div className="grid grid-cols-2 gap-4">
          {scenarios.map(({ id, label, sub, icon, color }) => {
            const c = colorMap[color];
            const isActive = activeScenario === id;
            return (
              <button
                key={id}
                disabled={isUpdating}
                onClick={() => handleScenario(id)}
                className={`flex items-start gap-4 p-4 rounded-xl text-left transition-all border
                  ${isActive
                    ? `${c.bg} ${c.border} ring-1 ${c.ring}`
                    : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
                  }`}
              >
                <div className={`mt-0.5 p-2 rounded-lg ${isActive ? c.bg : 'bg-zinc-700/50'}`}>
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-100">{label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Event Injection */}
      <SectionCard
        title="Event Injection"
        subtitle="Force events to test the RL model's priority handling outside normal distribution."
        icon={<AlertTriangle size={18} className="text-amber-400" />}
      >
        <button
          onClick={handleSpawnAmbulance}
          className="w-full flex items-center justify-center gap-3 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        >
          <Car size={20} />
          Force Spawn Emergency Vehicle
        </button>
      </SectionCard>

      {/* Drive Side */}
      <SectionCard
        title="Drive Convention"
        subtitle="Set the physical road convention. The RL agent adapts behaviour to this constraint."
        icon={<Map size={18} className="text-blue-400" />}
      >
        <div className="flex gap-4">
          {['right', 'left'].map((side) => {
            const isActive = !state?.drive_side ? side === 'right' : state.drive_side === side;
            return (
              <button
                key={side}
                disabled={isUpdating}
                onClick={() => handleDriveSide(side)}
                className={`flex-1 py-4 font-semibold rounded-xl transition-all relative overflow-hidden
                  ${isActive
                    ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
              >
                {side.charAt(0).toUpperCase() + side.slice(1)}-Hand Drive
                {isActive && (
                  <span className="block text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full mt-1 w-fit mx-auto">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

    </div>
  );
}
