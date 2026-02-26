import React from 'react';
import { AlertTriangle, Power, Car } from 'lucide-react';

export default function Controls({ state }) {
  const handleStart = async () => {
    await fetch('http://localhost:8000/api/simulation/start', { method: 'POST' });
  };

  const handleStop = async () => {
    await fetch('http://localhost:8000/api/simulation/stop', { method: 'POST' });
  };

  const handleSpawnAmbulance = async () => {
    await fetch('http://localhost:8000/api/simulation/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traffic_density: 0.1, spawn_ambulance: true })
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Engine Controls</h2>
        <p className="text-zinc-400">Manage the core reinforcement learning simulation engine.</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button 
          onClick={handleStart}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Power className="text-emerald-400" size={32} />
          </div>
          <span className="text-emerald-400 font-medium text-lg">Initialize Engine</span>
        </button>

        <button 
          onClick={handleStop}
          className="flex flex-col items-center justify-center gap-3 p-8 bg-red-500/10 border border-red-500/20 hover:border-red-500/50 rounded-2xl transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Power className="text-red-400" size={32} />
          </div>
          <span className="text-red-400 font-medium text-lg">Halt Engine</span>
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

        <button 
          onClick={handleSpawnAmbulance}
          className="w-full flex items-center justify-center gap-3 py-4 bg-amber-500 text-black font-semibold rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <Car size={20} />
          Force Spawn Emergency Vehicle
        </button>
      </div>
    </div>
  );
}
