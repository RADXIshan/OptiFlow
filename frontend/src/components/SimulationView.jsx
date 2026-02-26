import React, { useRef, useEffect } from 'react';

export default function SimulationView({ state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!state || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Resize handling could go here, for now assume fixed logical size
    const width = canvas.width = 800;
    const height = canvas.height = 800;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a'; // Background
    ctx.fillRect(0, 0, width, height);
    
    // Draw Roads (Cross)
    const roadWidth = 240;
    const center = { x: width / 2, y: height / 2 };
    const hs = roadWidth / 2;
    
    ctx.fillStyle = '#1f1f22'; // Road color
    // Vertical road
    ctx.fillRect(center.x - hs, 0, roadWidth, height);
    // Horizontal road
    ctx.fillRect(0, center.y - hs, width, roadWidth);
    
    // Intersection square
    ctx.fillStyle = '#27272a';
    ctx.fillRect(center.x - hs, center.y - hs, roadWidth, roadWidth);

    // Draw Lane Dividers
    ctx.strokeStyle = '#52525b';
    ctx.setLineDash([15, 15]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Vertical divider
    ctx.moveTo(center.x, 0); ctx.lineTo(center.x, center.y - hs);
    ctx.moveTo(center.x, center.y + hs); ctx.lineTo(center.x, height);
    // Horizontal divider
    ctx.moveTo(0, center.y); ctx.lineTo(center.x - hs, center.y);
    ctx.moveTo(center.x + hs, center.y); ctx.lineTo(width, center.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Optional: draw dashed lines separating the 3 incoming lanes
    // E.g. North approach (cars coming South). They are on the left side of vertical divider (if right hand traffic)
    // Actually standard is right hand traffic, so incoming North cars are on the Left of the screen (x < center.x)
    const drawApproaches = () => {
      // Just some simple lines to demarcate lanes
      ctx.strokeStyle = '#3f3f46';
      ctx.setLineDash([5, 10]);
      [center.x - hs/3, center.x - (2*hs/3), center.x + hs/3, center.x + (2*hs/3)].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, center.y - hs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, center.y + hs); ctx.lineTo(x, height); ctx.stroke();
      });
      [center.y - hs/3, center.y - (2*hs/3), center.y + hs/3, center.y + (2*hs/3)].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(center.x - hs, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(center.x + hs, y); ctx.lineTo(width, y); ctx.stroke();
      });
      ctx.setLineDash([]);
    };
    drawApproaches();

    // Map the current Phase to Green Lights
    // Phase 0: NS Straight/Right (North approach, South approach)
    // Phase 1: NS Left
    // Phase 2: EW Straight/Right
    // Phase 3: EW Left
    const phase = state.phase;
    
    const drawLight = (x, y, isGreen) => {
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.shadowColor = isGreen ? '#10b981' : '#ef4444';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    // Very simplified light placement
    // North Approach Stop Line Lights
    drawLight(center.x - roadWidth/4 + 20, center.y - hs - 10, phase === 0 || phase === 1);
    // South Approach Stop Line Lights
    drawLight(center.x + roadWidth/4 - 20, center.y + hs + 10, phase === 0 || phase === 1);
    // East Approach
    drawLight(center.x + hs + 10, center.y - roadWidth/4 + 20, phase === 2 || phase === 3);
    // West Approach
    drawLight(center.x - hs - 10, center.y + roadWidth/4 - 20, phase === 2 || phase === 3);

    // Draw Vehicles based on queue size
    const drawVehicles = (laneName, queue, isIncoming) => {
      // Simplified: Just draw boxes starting from stop line backwards
      // North approach: N_left, N_straight, N_right
      // N comes from top. Cars move south. Incoming is left of center.
      if (!queue) return;
      
      let startX, startY, dx, dy;
      let laneW = hs / 3;

      if (laneName.startsWith("N_")) {
        // incoming moving South. X is between center-hs and center.
        if (laneName.includes("left")) startX = center.x - laneW/2;
        if (laneName.includes("straight")) startX = center.x - 3*laneW/2;
        if (laneName.includes("right")) startX = center.x - 5*laneW/2;
        startY = center.y - hs - 15; dx = 0; dy = -25;
      } else if (laneName.startsWith("S_")) {
        if (laneName.includes("left")) startX = center.x + laneW/2;
        if (laneName.includes("straight")) startX = center.x + 3*laneW/2;
        if (laneName.includes("right")) startX = center.x + 5*laneW/2;
        startY = center.y + hs + 15; dx = 0; dy = 25;
      } else if (laneName.startsWith("E_")) {
        if (laneName.includes("left")) startY = center.y - laneW/2;
        if (laneName.includes("straight")) startY = center.y - 3*laneW/2;
        if (laneName.includes("right")) startY = center.y - 5*laneW/2;
        startX = center.x + hs + 15; dx = 25; dy = 0;
      } else if (laneName.startsWith("W_")) {
        if (laneName.includes("left")) startY = center.y + laneW/2;
        if (laneName.includes("straight")) startY = center.y + 3*laneW/2;
        if (laneName.includes("right")) startY = center.y + 5*laneW/2;
        startX = center.x - hs - 15; dx = -25; dy = 0;
      }

      queue.forEach((vehicle, idx) => {
        const x = startX + dx * idx;
        const y = startY + dy * idx;

        ctx.fillStyle = vehicle.type === 'ambulance' ? '#ef4444' : 
                        vehicle.type === 'bus' ? '#f59e0b' : 
                        vehicle.type === 'bike' ? '#10b981' : '#3b82f6';
        
        ctx.beginPath();
        if (vehicle.type === 'bike') {
           ctx.arc(x, y, 4, 0, Math.PI * 2);
        } else {
           const vw = (dx === 0) ? 10 : (vehicle.type === 'bus' ? 24 : 14);
           const vh = (dy === 0) ? 10 : (vehicle.type === 'bus' ? 24 : 14);
           ctx.roundRect(x - vw/2, y - vh/2, vw, vh, 2);
        }
        ctx.fill();

        // Adding glow for ambulance
        if (vehicle.type === 'ambulance') {
          // simulate strobe
          if (Math.random() > 0.5) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });
    };

    if (state.lanes) {
      Object.entries(state.lanes).forEach(([laneName, queue]) => {
        drawVehicles(laneName, queue, true);
      });
    }

  }, [state]);

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for simulation data...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl shadow-2xl relative overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="rounded-xl w-full max-w-3xl aspect-square object-contain"
        />
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-mono text-blue-400">T={state.step}</span>
        </div>
      </div>
      <p className="text-zinc-500 text-sm">Real-time 2D overhead simulation representation</p>
    </div>
  );
}
