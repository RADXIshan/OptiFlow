import React from 'react';
import { Activity, Cpu, GitBranch, BarChart2, Shield } from 'lucide-react';

function Section({ icon, title, children }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-800 rounded-lg">{icon}</div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Tag({ children, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

export default function AboutView() {
  const phases = [
    { id: 0, label: 'N-S Green (Straight / Right)', desc: 'North–South flowing vehicles cross straight or turn right.' },
    { id: 1, label: 'N-S Green (Left Turn)',         desc: 'Protected left-turn phase for North–South traffic only.' },
    { id: 2, label: 'E-W Green (Straight / Right)', desc: 'East–West flowing vehicles cross straight or turn right.' },
    { id: 3, label: 'E-W Green (Left Turn)',         desc: 'Protected left-turn phase for East–West traffic only.' },
  ];

  const metrics = [
    { name: 'Active Vehicles',   desc: 'Total vehicles currently queued across all observed lanes.' },
    { name: 'Avg Queue Wait',    desc: 'Mean seconds each vehicle has been waiting at a red light.' },
    { name: 'Max Queue Wait',    desc: 'Worst-case single vehicle wait — a key indicator of localized deadlock.' },
    { name: 'Congestion Level',  desc: 'Derived from vehicle count and max wait. Low → Moderate → Severe.' },
    { name: 'CO₂ Emissions',     desc: 'Estimated CO₂ from idling vehicles vs. real-life baselines (±15/90 s avg wait).' },
    { name: 'Efficiency Score',  desc: 'How much CO₂ the RL system saved vs. a naive fixed-time baseline, shown as %.' },
  ];



  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Hero */}
      <div className="bg-linear-to-br from-blue-900/40 via-zinc-900/60 to-black rounded-2xl border border-blue-800/30 p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Activity className="text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">OptiFlow</h1>
            <p className="text-blue-300 text-sm mt-0.5">AI-Powered Traffic Signal Optimizer</p>
          </div>
        </div>
        <p className="text-zinc-300 leading-relaxed">
          OptiFlow uses a <strong>deep Reinforcement Learning</strong> (RL) agent to control traffic signals across
          a grid of intersections in real time. Unlike fixed-timing approaches, the agent observes
          vehicle queue lengths, vehicle types, and current signal phases, then selects actions to
          minimize total wait time and prioritise emergency vehicles — all without any hard-coded rules.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Tag color="blue">PPO Reinforcement Learning</Tag>
          <Tag color="green">Multi-Agent Grid</Tag>
          <Tag color="purple">Stable Baselines 3</Tag>
          <Tag color="amber">FastAPI + WebSocket</Tag>
        </div>
      </div>

      {/* How it works */}
      <Section icon={<Cpu size={20} className="text-blue-400" />} title="How the RL Agent Works">
        <div className="space-y-3 text-zinc-300 text-sm leading-relaxed">
          <p>
            <span className="text-white font-medium">Observation space:</span> For each intersection
            the agent receives queue length and ambulance presence per lane (12 lanes × 2 = 24 values),
            plus the current phase and transitioning flag — <code className="text-blue-300 bg-blue-500/10 px-1 rounded">26 features per node</code>.
          </p>
          <p>
            <span className="text-white font-medium">Action space:</span> At each timestep the agent
            picks one of 4 traffic phases per intersection simultaneously
            (<code className="text-blue-300 bg-blue-500/10 px-1 rounded">MultiDiscrete [4]ⁿ</code>).
          </p>
          <p>
            <span className="text-white font-medium">Reward function:</span> The agent is penalised for
            vehicle waiting time (exponent 1.4 to punish long queues heavily) and heavily penalised for
            ambulance delay (exponent 1.8 × 15). It earns a bonus for every vehicle it clears.
          </p>
          <p>
            <span className="text-white font-medium">Emergency preemption:</span> If an ambulance is
            detected in a queue, the environment overrides the agent's action to force a green light for
            that vehicle — ensuring sub-second emergency response time.
          </p>
        </div>
      </Section>

      {/* Phase table */}
      <Section icon={<GitBranch size={20} className="text-emerald-400" />} title="Traffic Signal Phases">
        <div className="space-y-3">
          {phases.map(p => (
            <div key={p.id} className="flex items-start gap-4 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="text-emerald-400 font-mono font-bold text-base bg-emerald-400/10 w-9 h-9 flex items-center justify-center rounded-lg shrink-0">
                {p.id}
              </div>
              <div>
                <p className="text-zinc-200 font-medium text-sm">{p.label}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-zinc-500 text-xs">
          A yellow transition phase (1 step) separates any two different phases to simulate real-world
          all-red clearance intervals.
        </p>
      </Section>

      {/* Metrics */}
      <Section icon={<BarChart2 size={20} className="text-purple-400" />} title="Reading the Dashboard">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map(m => (
            <div key={m.name} className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <p className="text-zinc-200 font-semibold text-sm mb-1">{m.name}</p>
              <p className="text-zinc-500 text-xs leading-snug">{m.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Emergency vehicles */}
      <Section icon={<Shield size={20} className="text-red-400" />} title="Emergency Vehicle Handling">
        <p className="text-zinc-300 text-sm leading-relaxed">
          When any ambulance vehicle enters a queue, the simulation automatically overrides the RL
          agent's action to grant a green light on that lane. The Dashboard's
          <span className="text-red-400 font-medium"> Critical Response</span> card shows active ambulances.
          You can inject one via the <span className="text-amber-400 font-medium">Controls → Event Injection</span> panel.
        </p>
      </Section>
    </div>
  );
}
