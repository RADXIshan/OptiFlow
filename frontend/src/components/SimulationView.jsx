import React, { useRef, useEffect } from 'react';

export default function SimulationView({ state }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!state || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Canvas dimensions
    const width = canvas.width = 800;
    const height = canvas.height = 800;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a'; // Background
    ctx.fillRect(0, 0, width, height);
    
    // Geometry
    const roadWidth = 240;
    const center = { x: width / 2, y: height / 2 };
    const hs = roadWidth / 2; // half size
    
    // Layout Direction: 1 for Right-Hand Drive, -1 for Left-Hand Drive
    const lDir = state.drive_side === 'left' ? -1 : 1;

    // Draw Roads
    ctx.fillStyle = '#18181b'; // Road color
    ctx.fillRect(center.x - hs, 0, roadWidth, height);
    ctx.fillRect(0, center.y - hs, width, roadWidth);
    
    // Intersection
    ctx.fillStyle = '#27272a';
    ctx.fillRect(center.x - hs, center.y - hs, roadWidth, roadWidth);

    // Crosswalks
    const cwWidth = 30;
    ctx.fillStyle = '#d4d4d8';
    // North crosswalk
    for (let i = center.x - hs + 10; i < center.x + hs; i += 20) {
      ctx.fillRect(i, center.y - hs - cwWidth, 10, cwWidth - 5);
      // South crosswalk
      ctx.fillRect(i, center.y + hs + 5, 10, cwWidth - 5);
    }
    // West crosswalk
    for (let i = center.y - hs + 10; i < center.y + hs; i += 20) {
      ctx.fillRect(center.x - hs - cwWidth, i, cwWidth - 5, 10);
      // East crosswalk
      ctx.fillRect(center.x + hs + 5, i, cwWidth - 5, 10);
    }

    // Draw Lane Dividers
    ctx.strokeStyle = '#facc15'; // Double yellow line in the middle
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(center.x - 2, 0); ctx.lineTo(center.x - 2, center.y - hs - cwWidth);
    ctx.moveTo(center.x + 2, 0); ctx.lineTo(center.x + 2, center.y - hs - cwWidth);
    
    ctx.moveTo(center.x - 2, center.y + hs + cwWidth); ctx.lineTo(center.x - 2, height);
    ctx.moveTo(center.x + 2, center.y + hs + cwWidth); ctx.lineTo(center.x + 2, height);
    
    ctx.moveTo(0, center.y - 2); ctx.lineTo(center.x - hs - cwWidth, center.y - 2);
    ctx.moveTo(0, center.y + 2); ctx.lineTo(center.x - hs - cwWidth, center.y + 2);
    
    ctx.moveTo(center.x + hs + cwWidth, center.y - 2); ctx.lineTo(width, center.y - 2);
    ctx.moveTo(center.x + hs + cwWidth, center.y + 2); ctx.lineTo(width, center.y + 2);
    ctx.stroke();

    // White dashed lines for lanes
    ctx.strokeStyle = '#e4e4e7';
    ctx.setLineDash([15, 15]);
    ctx.lineWidth = 2;
    const laneW = hs / 3;
    
    // Uses absolute laneW since it's just visual dashed lines, flip doesn't strictly matter for symmetrical dashes but good for consistency
    [center.x - laneW, center.x - 2*laneW].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, center.y - hs - cwWidth); ctx.stroke();
    });
    [center.x + laneW, center.x + 2*laneW].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, center.y + hs + cwWidth); ctx.lineTo(x, height); ctx.stroke();
    });
    [center.y - laneW, center.y - 2*laneW].forEach(y => {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(center.x - hs - cwWidth, y); ctx.stroke();
    });
    [center.y + laneW, center.y + 2*laneW].forEach(y => {
        ctx.beginPath(); ctx.moveTo(center.x + hs + cwWidth, y); ctx.lineTo(width, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    // Stop lines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(center.x - hs, center.y - hs - cwWidth - 5, hs, 5); // North incoming (moving South)
    ctx.fillRect(center.x, center.y + hs + cwWidth, hs, 5); // South incoming (moving North)
    ctx.fillRect(center.x + hs + cwWidth, center.y - hs, 5, hs); // East incoming (moving West)
    ctx.fillRect(center.x - hs - cwWidth - 5, center.y, 5, hs); // West incoming (moving East)

    // Directional Arrows
    const drawArrow = (x, y, dir, type) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(dir * Math.PI / 180);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        // Helper closures to draw paths cleanly
        const pathStraight = () => {
            ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(6, -5); 
            ctx.lineTo(14, -5); ctx.lineTo(0, -25); ctx.lineTo(-14, -5); ctx.lineTo(-6, -5);
        };
        const pathLeft = () => {
            ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(6, 4); ctx.lineTo(-10, 4);
            ctx.lineTo(-10, -4); ctx.lineTo(-4, -4); ctx.lineTo(-14, -18); ctx.lineTo(-24, -4); ctx.lineTo(-18, -4); ctx.lineTo(-18, 12); ctx.lineTo(-6, 12);
        };
        const pathRight = () => {
             ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(6, 12); ctx.lineTo(18, 12);
             ctx.lineTo(18, -4); ctx.lineTo(24, -4); ctx.lineTo(14, -18); ctx.lineTo(4, -4); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.lineTo(-6, 4);
        };

        ctx.beginPath();
        if (type === 'straight') {
            pathStraight();
        } else if (type === 'left') {
            pathLeft();
        } else if (type === 'right') {
            pathRight();
        } else if (type === 'straight_left') {
            pathStraight();
            ctx.closePath();
            ctx.moveTo(-6, 4); ctx.lineTo(6, 4); 
            ctx.lineTo(6, 4); ctx.lineTo(-10, 4);
            ctx.lineTo(-10, -4); ctx.lineTo(-4, -4); ctx.lineTo(-14, -18); ctx.lineTo(-24, -4); ctx.lineTo(-18, -4); ctx.lineTo(-18, 12); ctx.lineTo(-6, 12);
        } else if (type === 'straight_right') {
            pathStraight();
            ctx.closePath();
            ctx.moveTo(-6, 4); ctx.lineTo(6, 4);
            ctx.lineTo(6, 12); ctx.lineTo(18, 12);
            ctx.lineTo(18, -4); ctx.lineTo(24, -4); ctx.lineTo(14, -18); ctx.lineTo(4, -4); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.lineTo(-6, 4);
        }
        ctx.fill();
        ctx.restore();
    };

    // Driving Side Logic mapping
    // Left-most lane: index 0.5 under RHD (inner), index 2.5 under LHD (outer)
    // Middle lane (index 1.5): always straight.
    // Right-most lane: index 2.5 under RHD (outer), index 0.5 under LHD (inner)
    
    // As per user request:
    // LHD (lDir=-1): Left-most (outer, index 2.5) is left turn only. Right-most (inner, index 0.5) is straight + right.
    // RHD (lDir=1): Left-most (inner, index 0.5) is straight + left. Right-most (outer, index 2.5) is right turn only.
    
    // In our coordinate system before drawing, 'innerArrow' is index 0.5 (physically closest to center meridian), 'outerArrow' is index 2.5 (closest to sidewalk)
    let innerArrow, middleArrow, outerArrow;
    if (lDir === 1) { // RHD
        // inner (index 0.5, Left-most visually since road draws left-to-right relative to center)
        innerArrow = 'straight_left'; 
        middleArrow = 'straight';
        // outer (index 2.5, Right-most visually)
        outerArrow = 'right';
    } else { // LHD
        // For LHD, drawing order relies on `lDir = -1`. 
        // Thus center.x - (lDir * 0.5 * laneW) becomes center.x + 0.5 * laneW -> meaning innerArrow is drawn on the physical RIGHT SIDE of the approach.
        // Therefore, innerArrow is the Right-most lane visually.
        innerArrow = 'straight_right';
        middleArrow = 'straight';
        // outerArrow (index 2.5) gets drawn at center.x + 2.5 * laneW, which is the physical LEFT SIDE.
        // Therefore outerArrow is the Left-most lane visually.
        outerArrow = 'left';
    }

    // Since we flipped `lDir` multiplication in the draws, the offsets naturally handle positioning left-to-right on screen!
    
    // North incoming (pointing South, orientation 180)
    drawArrow(center.x - lDir*0.5*laneW, center.y - hs - cwWidth - 60, 180, innerArrow);
    drawArrow(center.x - lDir*1.5*laneW, center.y - hs - cwWidth - 60, 180, middleArrow);
    drawArrow(center.x - lDir*2.5*laneW, center.y - hs - cwWidth - 60, 180, outerArrow);

    // South incoming (pointing North, orientation 0)
    drawArrow(center.x + lDir*0.5*laneW, center.y + hs + cwWidth + 60, 0, innerArrow);
    drawArrow(center.x + lDir*1.5*laneW, center.y + hs + cwWidth + 60, 0, middleArrow);
    drawArrow(center.x + lDir*2.5*laneW, center.y + hs + cwWidth + 60, 0, outerArrow);

    // East incoming (pointing West, orientation -90)
    drawArrow(center.x + hs + cwWidth + 60, center.y - lDir*0.5*laneW, -90, innerArrow);
    drawArrow(center.x + hs + cwWidth + 60, center.y - lDir*1.5*laneW, -90, middleArrow);
    drawArrow(center.x + hs + cwWidth + 60, center.y - lDir*2.5*laneW, -90, outerArrow);

    // West incoming (pointing East, orientation 90)
    drawArrow(center.x - hs - cwWidth - 60, center.y + lDir*0.5*laneW, 90, innerArrow);
    drawArrow(center.x - hs - cwWidth - 60, center.y + lDir*1.5*laneW, 90, middleArrow);
    drawArrow(center.x - hs - cwWidth - 60, center.y + lDir*2.5*laneW, 90, outerArrow);

    // Map Phase to Green Lights
    const phase = state.phase;
    
    const drawTrafficLight = (x, y, isGreen, orientation) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(orientation * Math.PI / 180);
      
      // Housing
      ctx.fillStyle = '#09090b';
      ctx.fillRect(-8, -20, 16, 40);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -20, 16, 40);
      
      const drawBulb = (by, color, isActive) => {
          ctx.beginPath();
          ctx.arc(0, by, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? color : '#1f2937';
          if (isActive) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 12;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
      };
      
      drawBulb(-12, '#ef4444', !isGreen); // Red
      drawBulb(0, '#eab308', false);      // Yellow
      drawBulb(12, '#10b981', isGreen);   // Green
      
      ctx.restore();
    };

    // Lights for North Incoming (facing North, so orientation 180)
    const cwOffset = cwWidth + 12;
    drawTrafficLight(center.x - lDir*0.5*laneW, center.y - hs - cwOffset, phase === 1, 180); // Left/Cross
    drawTrafficLight(center.x - lDir*1.5*laneW, center.y - hs - cwOffset, phase === 0, 180); // Straight
    drawTrafficLight(center.x - lDir*2.5*laneW, center.y - hs - cwOffset, phase === 0, 180); // Right/Non-Cross

    // Lights for South Incoming (facing South, orientation 0)
    drawTrafficLight(center.x + lDir*0.5*laneW, center.y + hs + cwOffset, phase === 1, 0); // Left/Cross
    drawTrafficLight(center.x + lDir*1.5*laneW, center.y + hs + cwOffset, phase === 0, 0); // Straight
    drawTrafficLight(center.x + lDir*2.5*laneW, center.y + hs + cwOffset, phase === 0, 0); // Right/Non-Cross

    // Lights for East Incoming (facing East, orientation -90)
    drawTrafficLight(center.x + hs + cwOffset, center.y - lDir*0.5*laneW, phase === 3, -90); // Left/Cross
    drawTrafficLight(center.x + hs + cwOffset, center.y - lDir*1.5*laneW, phase === 2, -90); // Straight
    drawTrafficLight(center.x + hs + cwOffset, center.y - lDir*2.5*laneW, phase === 2, -90); // Right/Non-Cross

    // Lights for West Incoming (facing West, orientation 90)
    drawTrafficLight(center.x - hs - cwOffset, center.y + lDir*0.5*laneW, phase === 3, 90); // Left/Cross
    drawTrafficLight(center.x - hs - cwOffset, center.y + lDir*1.5*laneW, phase === 2, 90); // Straight
    drawTrafficLight(center.x - hs - cwOffset, center.y + lDir*2.5*laneW, phase === 2, 90); // Right/Non-Cross

    // Draw Vehicles
    const drawVehicles = (laneName, queue) => {
      if (!queue) return;
      
      let startX, startY, dx, dy;
      let spacingOffset = cwWidth + 25;

      if (laneName.startsWith("N_")) {
        if (laneName.includes("left")) startX = center.x - lDir*0.5*laneW;
        if (laneName.includes("straight")) startX = center.x - lDir*1.5*laneW;
        if (laneName.includes("right")) startX = center.x - lDir*2.5*laneW;
        startY = center.y - hs - spacingOffset; dx = 0; dy = -35;
      } else if (laneName.startsWith("S_")) {
        if (laneName.includes("left")) startX = center.x + lDir*0.5*laneW;
        if (laneName.includes("straight")) startX = center.x + lDir*1.5*laneW;
        if (laneName.includes("right")) startX = center.x + lDir*2.5*laneW;
        startY = center.y + hs + spacingOffset; dx = 0; dy = 35;
      } else if (laneName.startsWith("E_")) {
        if (laneName.includes("left")) startY = center.y - lDir*0.5*laneW;
        if (laneName.includes("straight")) startY = center.y - lDir*1.5*laneW;
        if (laneName.includes("right")) startY = center.y - lDir*2.5*laneW;
        startX = center.x + hs + spacingOffset; dx = 35; dy = 0;
      } else if (laneName.startsWith("W_")) {
        if (laneName.includes("left")) startY = center.y + lDir*0.5*laneW;
        if (laneName.includes("straight")) startY = center.y + lDir*1.5*laneW;
        if (laneName.includes("right")) startY = center.y + lDir*2.5*laneW;
        startX = center.x - hs - spacingOffset; dx = -35; dy = 0;
      }

      queue.forEach((vehicle, idx) => {
        const x = startX + dx * idx;
        const y = startY + dy * idx;

        const colors = {
            'car': '#3b82f6',
            'bus': '#f59e0b',
            'bike': '#10b981',
            'ambulance': '#ef4444'
        };
        
        ctx.fillStyle = colors[vehicle.type] || '#ffffff';
        
        ctx.save();
        ctx.translate(x, y);

        // Map movement direction to specific rotation angles
        // default arrow of vehicle drawing assumes pointing UP initially
        if (dx > 0) { ctx.rotate(-Math.PI/2); }       // moving East, facing West (from East approach)
        else if (dx < 0) { ctx.rotate(Math.PI/2); }   // moving West, facing East (from West approach)
        else if (dy > 0) { ctx.rotate(Math.PI); }     // moving South, facing North (from South approach)
        else if (dy < 0) { ctx.rotate(0); }           // moving North, facing South (from North approach)
        
        ctx.beginPath();
        if (vehicle.type === 'bike') {
           ctx.arc(0, 0, 5, 0, Math.PI * 2);
           ctx.fill();
        } else {
           const vw = vehicle.type === 'bus' ? 18 : 14;
           const vh = vehicle.type === 'bus' ? 38 : 24;
           ctx.roundRect(-vw/2, -vh/2, vw, vh, 3);
           ctx.fill();
           
           // Windshield
           ctx.fillStyle = '#1e3a8a';
           ctx.fillRect(-vw/2 + 2, vh/2 - 8, vw - 4, 4);
        }

        // Ambulance strobe
        if (vehicle.type === 'ambulance') {
          if (Math.random() > 0.5) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI*2);
            ctx.fill();
          }
        }
        ctx.restore();
      });
    };

    if (state.lanes) {
      Object.entries(state.lanes).forEach(([laneName, queue]) => {
        drawVehicles(laneName, queue);
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
    <div className="flex items-center justify-center h-full w-full relative">
      <div className="absolute top-6 right-6 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 p-4 rounded-xl shadow-2xl z-20 flex flex-col gap-3 min-w-[140px]">
        <h3 className="text-zinc-200 text-xs font-bold uppercase tracking-wider mb-1">Vehicle Details</h3>
        <div className="flex items-center gap-3">
          <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
          <span className="text-sm font-medium text-zinc-300">Car</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-5 h-3 bg-amber-500 rounded-sm"></div>
          <span className="text-sm font-medium text-zinc-300">Bus</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full ml-1"></div>
          <span className="text-sm font-medium text-zinc-300 ml-0.5">Bike</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-3 bg-red-500 rounded-sm shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
          <span className="text-sm font-medium text-zinc-300">Ambulance</span>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-4 w-full h-full max-h-[90vh]">
        <div className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded-3xl shadow-2xl relative overflow-hidden flex-1 aspect-square flex items-center justify-center w-full max-w-4xl group">
          <canvas 
            ref={canvasRef} 
            className="rounded-2xl w-full h-full object-contain mix-blend-lighten"
          />
          
          <div className="absolute top-6 left-6 flex items-center gap-3 bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl z-20" title="T: Simulation Time Step&#10;Phase: Current Traffic Light Combination (0-3)">
            <div className={`w-3 h-3 rounded-full ${state.is_running ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
            <span className="text-sm font-bold tracking-widest text-emerald-400">T (Time): {state.step}</span>
            <div className="w-px h-4 bg-zinc-700 mx-1"></div>
            <span className="text-sm font-mono text-zinc-400 font-medium">Light Phase: <span className="text-zinc-200">{state.phase}</span></span>
          </div>

          <div className="absolute bottom-6 left-6 bg-zinc-950/90 backdrop-blur-md border border-zinc-800/50 p-4 rounded-xl shadow-2xl z-20 flex flex-col gap-2 min-w-[180px] opacity-0 group-hover:opacity-100 transition-opacity">
            <h3 className="text-zinc-200 text-xs font-bold uppercase tracking-wider mb-1">Live Metrics</h3>
            <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Active Vehicles</span>
                <span className="font-mono font-bold text-white">{state.vehicles?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Ambulances</span>
                <span className={`font-mono font-bold ${state.vehicles?.filter(v => v.type === 'ambulance').length > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>
                    {state.vehicles?.filter(v => v.type === 'ambulance').length || 0}
                </span>
            </div>
          </div>
        </div>
        <p className="text-zinc-500 text-sm font-medium">Real-time Intersection Visualization Engine. Hover inner HUD for live stats.</p>
      </div>
    </div>
  );
}
