import React, { useState } from 'react';
import { AlertTriangle, Power, Car, Map, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function Controls({ state }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  const handleStart = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/start`, { method: 'POST' });
      toast.success('Simulation Engine Started');
    } catch (e) {
      toast.error('Failed to start engine');
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/stop`, { method: 'POST' });
      toast.error('Simulation Engine Halted');
    } catch (e) {
      toast.error('Failed to halt engine');
    }
  };

  const handleReset = async () => {
    try {
      if (state?.is_running) {
        toast.error("Halt engine before resetting!");
        return;
      }
      await fetch(`${API_BASE}/api/simulation/reset`, { method: 'POST' });
      toast.info('Environment Reset');
    } catch (e) {
      toast.error('Failed to reset environment');
    }
  };

  const handleSpawnAmbulance = async () => {
    try {
      await fetch(`${API_BASE}/api/simulation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traffic_density: 0.1, spawn_ambulance: true })
      });
      toast.warning('Emergency Vehicle Spawned');
    } catch (e) {
      toast.error('Failed to spawn vehicle');
    }
  };

  const handleDriveSideToggle = async (side) => {
    setIsUpdating(true);
    try {
      await fetch(`${API_BASE}/api/simulation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traffic_density: 0.1, drive_side: side })
      });
      toast.info(`Switched to ${side}-hand drive`);
    } catch (e) {
      toast.error('Failed to update environment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePreemptionToggle = async (shouldEnable) => {
    setIsUpdating(true);
    try {
      await fetch(`${API_BASE}/api/simulation/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traffic_density: 0.1, emergency_override: shouldEnable })
      });
      if (shouldEnable) toast.error('STRICT OVERRIDE: Active. Clearing paths.');
      else toast.info('Strict override disabled. Resuming model control.');
    } catch (e) {
      toast.error('Failed to update preemption protocol');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Engine Controls</h2>
          <p className="text-zinc-400">Manage the core reinforcement learning simulation engine.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 ${state?.is_running ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
           <div className={`w-2 h-2 rounded-full ${state?.is_running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
           <span className="font-medium text-sm">{state?.is_running ? 'Engine Active' : 'Engine Halted'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={handleStart}
          disabled={state?.is_running}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all group ${state?.is_running ? 'bg-emerald-500/50 border border-emerald-500/50 cursor-not-allowed opacity-50' : 'bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50'}`}
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Power className="text-emerald-400" size={32} />
          </div>
          <span className="text-emerald-400 font-medium text-lg">Initialize Engine</span>
        </button>

        <button 
          onClick={handleStop}
          disabled={!state?.is_running}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all group ${!state?.is_running ? 'bg-red-500/50 border border-red-500/50 cursor-not-allowed opacity-50' : 'bg-red-500/10 border border-red-500/20 hover:border-red-500/50'}`}
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Power className="text-red-400" size={32} />
          </div>
          <span className="text-red-400 font-medium text-lg">Halt Engine</span>
        </button>

        <button 
          onClick={handleReset}
          disabled={state?.is_running}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all group ${state?.is_running ? 'bg-blue-500/50 border border-blue-500/50 cursor-not-allowed opacity-50' : 'bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/50'}`}
        >
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <RotateCcw className="text-blue-400" size={32} />
          </div>
          <span className="text-blue-400 font-medium text-lg">Reset Default</span>
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-400" />
          Event Injection
        </h3>
        <p className="text-zinc-400 text-sm mb-6">
          Trigger forced events to test the Reinforcement Learning model's priority handling out of normal distribution.
        </p>

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleSpawnAmbulance}
            className="w-full flex items-center justify-center gap-3 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Car size={20} />
            Force Spawn Emergency Vehicle
          </button>
          
          <button 
            disabled={isUpdating}
            onClick={() => handlePreemptionToggle(!state?.emergency_override)}
            className={`w-full flex items-center justify-center gap-3 py-4 font-semibold rounded-xl transition-all relative overflow-hidden ${state?.emergency_override ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            <AlertTriangle size={20} className={state?.emergency_override ? 'animate-pulse' : ''} />
            {state?.emergency_override ? 'DISABLE Strict Preemption' : 'ENABLE Strict Preemption'}
            {state?.emergency_override && <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full mt-1">ACTIVE</span>}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mt-8">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Map className="text-blue-400" />
          Environment Configuration
        </h3>
        <p className="text-zinc-400 text-sm mb-6">
          Adjust physical environment parameters. Note: The RL Agent adapts its behavior to these constraints.
        </p>

        <div className="flex gap-4">
          <button 
            disabled={isUpdating}
            onClick={() => handleDriveSideToggle('right')}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 font-semibold rounded-xl transition-all relative overflow-hidden ${state?.drive_side === 'right' || !state?.drive_side ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Right-Hand Drive
            {state?.drive_side === 'right' && <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full mt-1">Active Format</span>}
          </button>
          
          <button 
            disabled={isUpdating}
            onClick={() => handleDriveSideToggle('left')}
            className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 font-semibold rounded-xl transition-all relative overflow-hidden ${state?.drive_side === 'left' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Left-Hand Drive
            {state?.drive_side === 'left' && <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full mt-1">Active Format</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
