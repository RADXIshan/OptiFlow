import React, { useRef, useEffect, useState, useCallback } from 'react';

export default function SimulationView({ state }) {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('city'); // 'city' or 'crossroad'
  const [selectedCrossroad, setSelectedCrossroad] = useState('0_0');

  // Map of intersection grid position to canvas pixel rect (for click-to-zoom)
  const intersectionRectsRef = useRef([]);

  useEffect(() => {
    if (!state || !state.grid || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rects = [];
    intersectionRectsRef.current = rects;
    
    // Canvas dimensions
    const width = canvas.width = 1200;
    const height = canvas.height = 1200;
    
    // Clear canvas
    ctx.fillStyle = '#0a0a0a'; 
    ctx.fillRect(0, 0, width, height);
    
    const lDir = state.drive_side === 'left' ? -1 : 1;

    // Grid details
    const coords = Object.keys(state.grid).map(k => {
       const [r, c] = k.split('_').map(Number);
       return {r, c};
    });
    const rows = Math.max(...coords.map(c => c.r)) + 1;
    const cols = Math.max(...coords.map(c => c.c)) + 1;

    const drawIntersection = (interState, cx, cy, scale, extX = 800, extY = 800, gridKey = null) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        const roadWidth = 240;
        const hs = roadWidth / 2;
        
        // Draw Roads
        ctx.fillStyle = '#18181b'; 
        ctx.fillRect(-hs, -extY, roadWidth, extY * 2);
        ctx.fillRect(-extX, -hs, extX * 2, roadWidth);
        
        // Intersection Center
        const centerColor = '#27272a';
        ctx.fillStyle = centerColor;
        ctx.fillRect(-hs, -hs, roadWidth, roadWidth);

        // Crosswalks
        const cwWidth = 30;
        ctx.fillStyle = '#d4d4d8';
        for (let i = -hs + 10; i < hs; i += 20) {
          ctx.fillRect(i, -hs - cwWidth, 10, cwWidth - 5);
          ctx.fillRect(i, hs + 5, 10, cwWidth - 5);
        }
        for (let i = -hs + 10; i < hs; i += 20) {
          ctx.fillRect(-hs - cwWidth, i, cwWidth - 5, 10);
          ctx.fillRect(hs + 5, i, cwWidth - 5, 10);
        }

        // Draw Lane Dividers
        ctx.strokeStyle = '#facc15'; 
        ctx.lineWidth = 4;
        ctx.beginPath();
        // Top vertical
        ctx.moveTo(-2, -extY); ctx.lineTo(-2, -hs - cwWidth);
        ctx.moveTo(2, -extY); ctx.lineTo(2, -hs - cwWidth);
        
        // Bottom vertical
        ctx.moveTo(-2, hs + cwWidth); ctx.lineTo(-2, extY);
        ctx.moveTo(2, hs + cwWidth); ctx.lineTo(2, extY);
        
        // Left horizontal
        ctx.moveTo(-extX, -2); ctx.lineTo(-hs - cwWidth, -2);
        ctx.moveTo(-extX, 2); ctx.lineTo(-hs - cwWidth, 2);
        
        // Right horizontal
        ctx.moveTo(hs + cwWidth, -2); ctx.lineTo(extX, -2);
        ctx.moveTo(hs + cwWidth, 2); ctx.lineTo(extX, 2);
        ctx.stroke();

        ctx.strokeStyle = '#e4e4e7';
        ctx.setLineDash([15, 15]);
        ctx.lineWidth = 2;
        const laneW = hs / 3;
        
        [-laneW, -2*laneW].forEach(x => {
            ctx.beginPath(); ctx.moveTo(x, -extY); ctx.lineTo(x, -hs - cwWidth); ctx.stroke();
        });
        [laneW, 2*laneW].forEach(x => {
            ctx.beginPath(); ctx.moveTo(x, hs + cwWidth); ctx.lineTo(x, extY); ctx.stroke();
        });
        [-laneW, -2*laneW].forEach(y => {
            ctx.beginPath(); ctx.moveTo(-extX, y); ctx.lineTo(-hs - cwWidth, y); ctx.stroke();
        });
        [laneW, 2*laneW].forEach(y => {
            ctx.beginPath(); ctx.moveTo(hs + cwWidth, y); ctx.lineTo(extX, y); ctx.stroke();
        });
        ctx.setLineDash([]);

        // Stop lines
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-hs, -hs - cwWidth - 5, hs, 5); 
        ctx.fillRect(0, hs + cwWidth, hs, 5); 
        ctx.fillRect(hs + cwWidth, -hs, 5, hs); 
        ctx.fillRect(-hs - cwWidth - 5, 0, 5, hs); 

        // Directional Arrows
        const drawArrow = (x, y, dir, type) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(dir * Math.PI / 180);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            
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
            if (type === 'straight') pathStraight();
            else if (type === 'left') pathLeft();
            else if (type === 'right') pathRight();
            else if (type === 'straight_left') {
                pathStraight(); ctx.closePath();
                ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.lineTo(6, 4); ctx.lineTo(-10, 4);
                ctx.lineTo(-10, -4); ctx.lineTo(-4, -4); ctx.lineTo(-14, -18); ctx.lineTo(-24, -4); ctx.lineTo(-18, -4); ctx.lineTo(-18, 12); ctx.lineTo(-6, 12);
            } else if (type === 'straight_right') {
                pathStraight(); ctx.closePath();
                ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.lineTo(6, 12); ctx.lineTo(18, 12);
                ctx.lineTo(18, -4); ctx.lineTo(24, -4); ctx.lineTo(14, -18); ctx.lineTo(4, -4); ctx.lineTo(10, -4); ctx.lineTo(10, 4); ctx.lineTo(-6, 4);
            }
            ctx.fill();
            ctx.restore();
        };

        let innerArrow, middleArrow, outerArrow;
        if (lDir === 1) { 
            innerArrow = 'straight_left'; middleArrow = 'straight'; outerArrow = 'right';
        } else { 
            innerArrow = 'straight_right'; middleArrow = 'straight'; outerArrow = 'left';
        }

        drawArrow(-lDir*0.5*laneW, -hs - cwWidth - 60, 180, innerArrow);
        drawArrow(-lDir*1.5*laneW, -hs - cwWidth - 60, 180, middleArrow);
        drawArrow(-lDir*2.5*laneW, -hs - cwWidth - 60, 180, outerArrow);

        drawArrow(lDir*0.5*laneW, hs + cwWidth + 60, 0, innerArrow);
        drawArrow(lDir*1.5*laneW, hs + cwWidth + 60, 0, middleArrow);
        drawArrow(lDir*2.5*laneW, hs + cwWidth + 60, 0, outerArrow);

        drawArrow(hs + cwWidth + 60, -lDir*0.5*laneW, -90, innerArrow);
        drawArrow(hs + cwWidth + 60, -lDir*1.5*laneW, -90, middleArrow);
        drawArrow(hs + cwWidth + 60, -lDir*2.5*laneW, -90, outerArrow);

        drawArrow(-hs - cwWidth - 60, lDir*0.5*laneW, 90, innerArrow);
        drawArrow(-hs - cwWidth - 60, lDir*1.5*laneW, 90, middleArrow);
        drawArrow(-hs - cwWidth - 60, lDir*2.5*laneW, 90, outerArrow);

        // Map Phase to Green Lights
        const phase = interState.phase;
        const isTrans = interState.is_transitioning || false;
        
        const drawTrafficLight = (x, y, isActivePhase, orientation) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(orientation * Math.PI / 180);
          
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
          
          const showGreen = isActivePhase && !isTrans;
          const showYellow = isActivePhase && isTrans;
          const showRed = !isActivePhase;

          drawBulb(-12, '#ef4444', showRed); 
          drawBulb(0, '#eab308', showYellow);      
          drawBulb(12, '#10b981', showGreen);   
          
          ctx.restore();
        };

        const cwOffset = cwWidth + 12;
        drawTrafficLight(-lDir*0.5*laneW, -hs - cwOffset, phase === 1, 180); 
        drawTrafficLight(-lDir*1.5*laneW, -hs - cwOffset, phase === 0, 180); 
        drawTrafficLight(-lDir*2.5*laneW, -hs - cwOffset, phase === 0, 180); 

        drawTrafficLight(lDir*0.5*laneW, hs + cwOffset, phase === 1, 0); 
        drawTrafficLight(lDir*1.5*laneW, hs + cwOffset, phase === 0, 0); 
        drawTrafficLight(lDir*2.5*laneW, hs + cwOffset, phase === 0, 0); 

        drawTrafficLight(hs + cwOffset, -lDir*0.5*laneW, phase === 3, -90); 
        drawTrafficLight(hs + cwOffset, -lDir*1.5*laneW, phase === 2, -90); 
        drawTrafficLight(hs + cwOffset, -lDir*2.5*laneW, phase === 2, -90); 

        drawTrafficLight(-hs - cwOffset, lDir*0.5*laneW, phase === 3, 90); 
        drawTrafficLight(-hs - cwOffset, lDir*1.5*laneW, phase === 2, 90); 
        drawTrafficLight(-hs - cwOffset, lDir*2.5*laneW, phase === 2, 90); 

        // Draw Vehicles
        const drawVehicles = (laneName, queue) => {
          if (!queue) return;
          
          let startX = 0, startY = 0, dx = 0, dy = 0;
          let spacingOffset = cwWidth + 35; 

          if (laneName.startsWith("N_")) {
            if (laneName.includes("left")) startX = -lDir*0.5*laneW;
            if (laneName.includes("straight")) startX = -lDir*1.5*laneW;
            if (laneName.includes("right")) startX = -lDir*2.5*laneW;
            startY = -hs; dx = 0; dy = -1;
          } else if (laneName.startsWith("S_")) {
            if (laneName.includes("left")) startX = lDir*0.5*laneW;
            if (laneName.includes("straight")) startX = lDir*1.5*laneW;
            if (laneName.includes("right")) startX = lDir*2.5*laneW;
            startY = hs; dx = 0; dy = 1;
          } else if (laneName.startsWith("E_")) {
            if (laneName.includes("left")) startY = -lDir*0.5*laneW;
            if (laneName.includes("straight")) startY = -lDir*1.5*laneW;
            if (laneName.includes("right")) startY = -lDir*2.5*laneW;
            startX = hs; dx = 1; dy = 0;
          } else if (laneName.startsWith("W_")) {
            if (laneName.includes("left")) startY = lDir*0.5*laneW;
            if (laneName.includes("straight")) startY = lDir*1.5*laneW;
            if (laneName.includes("right")) startY = lDir*2.5*laneW;
            startX = -hs; dx = -1; dy = 0;
          }

          let currentOffset = spacingOffset;
          // Calculate max allowed distance from intersection center based on queue direction
          let maxCenterPos = Infinity;
          if (viewMode === 'city') {
              if (dy === 0) {
                  maxCenterPos = extX - hs + 15; // horizontal roads, stop just before the upstream intersection box
              } else if (dx === 0) {
                  maxCenterPos = extY - hs + 15; // vertical roads
              }
          }

          queue.forEach((vehicle) => {
            let vLength = 24;
            if (vehicle.type === 'bus') vLength = 38;
            if (vehicle.type === 'truck') vLength = 45;
            if (vehicle.type === 'bike') vLength = 10;

            const centerPos = currentOffset + vLength / 2;
            currentOffset += vLength + 8; 

            // Do not render the vehicle if it is overflowing into the upstream adjacent intersection box
            if (centerPos > maxCenterPos) {
                return;
            }

            const x = startX + dx * centerPos;
            const y = startY + dy * centerPos;

            const colors = {
                'car': '#3b82f6',
                'truck': '#8b5cf6', 
                'bus': '#f59e0b',
                'bike': '#ec4899',
                'ambulance': '#ef4444'
            };
            
            ctx.fillStyle = colors[vehicle.type] || '#ffffff';
            
            ctx.save();
            ctx.translate(x, y);

            if (dx > 0) { ctx.rotate(-Math.PI/2); }       
            else if (dx < 0) { ctx.rotate(Math.PI/2); }   
            else if (dy > 0) { ctx.rotate(Math.PI); }     
            else if (dy < 0) { ctx.rotate(0); }           
            
            ctx.beginPath();
            if (vehicle.type === 'bike') {
               ctx.arc(0, 0, 5, 0, Math.PI * 2);
               ctx.fill();
            } else {
               let vw = 14; 
               let vh = 24;
               if (vehicle.type === 'bus') { vw = 18; vh = 38; }
               if (vehicle.type === 'truck') { vw = 20; vh = 45; } 
               
               ctx.roundRect(-vw/2, -vh/2, vw, vh, 3);
               ctx.fill();
               
               ctx.fillStyle = '#1e3a8a';
               ctx.fillRect(-vw/2 + 2, vh/2 - 8, vw - 4, 4);
            }

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

        if (interState.lanes) {
          Object.entries(interState.lanes).forEach(([laneName, queue]) => {
            drawVehicles(laneName, queue);
          });
          
          if (viewMode === 'crossroad') {
            // Draw lane-specific metrics in crossroad view
            ctx.save();
            ctx.font = '24px "Inter", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const metricsOffset = hs + cwWidth + 140; 
            
            const drawLaneCount = (text, x, y) => {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.beginPath();
              ctx.roundRect(x - 30, y - 20, 60, 40, 8);
              ctx.fill();
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 2;
              ctx.stroke();
              ctx.fillStyle = '#60a5fa';
              ctx.fillText(text, x, y);
            };

            const nTotal = interState.lanes['N_straight'].length + interState.lanes['N_left'].length + interState.lanes['N_right'].length;
            const sTotal = interState.lanes['S_straight'].length + interState.lanes['S_left'].length + interState.lanes['S_right'].length;
            const eTotal = interState.lanes['E_straight'].length + interState.lanes['E_left'].length + interState.lanes['E_right'].length;
            const wTotal = interState.lanes['W_straight'].length + interState.lanes['W_left'].length + interState.lanes['W_right'].length;
            
            drawLaneCount(nTotal, 0, -metricsOffset);
            drawLaneCount(sTotal, 0, metricsOffset);
            drawLaneCount(eTotal, metricsOffset, 0);
            drawLaneCount(wTotal, -metricsOffset, 0);
            ctx.restore();
          }
        }

        ctx.restore();
    };

    if (viewMode === 'city') {
        const spacingX = width / cols;
        const spacingY = height / rows;
        const scale = Math.min(spacingX / 800, spacingY / 800); 
        const extX = (spacingX / 2) / scale;
        const extY = (spacingY / 2) / scale;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = (c + 0.5) * spacingX;
                const cy = (r + 0.5) * spacingY;
                const interState = state.grid[`${r}_${c}`];
                if (interState) {
                    // Store rect for click detection
                    rects.push({ key: `${r}_${c}`, cx, cy, hw: spacingX / 2, hh: spacingY / 2 });
                    drawIntersection(interState, cx, cy, scale, extX, extY, `${r}_${c}`);
                }
            }
        }
        
        // Draw City View metrics AFTER all intersections to prevent clipping from adjacent roads
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = (c + 0.5) * spacingX;
                const cy = (r + 0.5) * spacingY;
                const interState = state.grid[`${r}_${c}`];
                
                if (interState) {
                    const totalVehicles = Object.values(interState.lanes || {}).reduce((acc, q) => acc + q.length, 0);
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.scale(scale, scale);
                    
                    ctx.font = 'bold 32px "Inter", sans-serif'; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.beginPath();
                    // Draw a responsive pill/rounded box
                    const textMetrics = ctx.measureText(totalVehicles);
                    const boxWidth = Math.max(80, textMetrics.width + 40);
                    ctx.roundRect(-boxWidth/2, -40, boxWidth, 80, 20);
                    ctx.fill();
                    ctx.strokeStyle = totalVehicles > 15 ? '#ef4444' : (totalVehicles > 5 ? '#eab308' : '#10b981');
                    ctx.lineWidth = 4;
                    ctx.stroke();
                    
                    ctx.fillStyle = '#ffffff';
                    // Ensure accurate vertical centering relative to our roundRect
                    ctx.fillText(totalVehicles, 0, 2);
                    
                    ctx.restore();
                }
            }
        }
    } else {
        const cx = 600;
        const cy = 600;
        // Increase crossroad view scale from 1.0 to 1.6 to make the single intersection appear much larger.
        const scale = 1.6;
        const interState = state.grid[selectedCrossroad];
        if (interState) {
            drawIntersection(interState, cx, cy, scale);
        }
    }

  }, [state, viewMode, selectedCrossroad]);

  // ── Click-to-zoom handler (must be outside useEffect) ────────────────────
  const handleCanvasClick = useCallback((e) => {
    if (viewMode !== 'city') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top)  * scaleY;
    for (const { key, cx, cy, hw, hh } of intersectionRectsRef.current) {
      if (Math.abs(clickX - cx) < hw && Math.abs(clickY - cy) < hh) {
        setSelectedCrossroad(key);
        setViewMode('crossroad');
        break;
      }
    }
  }, [viewMode]);

  if (!state || !state.grid) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Waiting for simulation data...
      </div>
    );
  }

  const coords = Object.keys(state.grid);

  return (
    <div className="flex flex-col items-center justify-start pt-6 h-full w-full relative">
      <div className="z-40 mb-4 bg-zinc-900/80 backdrop-blur-md p-2 rounded-xl flex flex-wrap gap-3 border border-zinc-800">
          <button 
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'city' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              onClick={() => setViewMode('city')}
          >
              City Grid View
          </button>
          <button 
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'crossroad' ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              onClick={() => setViewMode('crossroad')}
          >
              Crossroad View
          </button>
          
          {viewMode === 'crossroad' && (
              <select 
                  value={selectedCrossroad}
                  onChange={(e) => setSelectedCrossroad(e.target.value)}
                  className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                  {coords.map(k => (
                      <option key={k} value={k}>Intersection {k.replace('_', ',')}</option>
                  ))}
              </select>
          )}

      </div>

      <div className="absolute top-6 right-6 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 p-4 rounded-xl shadow-2xl z-20 flex flex-col gap-3 min-w-[200px]">
        {(() => {
          let vehicles = [];
          if (viewMode === 'city') {
             Object.values(state.grid || {}).forEach(inter => {
                 Object.values(inter.lanes || {}).forEach(q => {
                     vehicles.push(...q);
                 });
             });
          } else {
             const inter = state.grid?.[selectedCrossroad];
             if (inter) {
                 Object.values(inter.lanes || {}).forEach(q => {
                     vehicles.push(...q);
                 });
             }
          }

          const counts = { total: 0, car: 0, truck: 0, bus: 0, bike: 0, ambulance: 0 };
          vehicles.forEach(v => {
              counts.total++;
              if (counts[v.type] !== undefined) {
                  counts[v.type]++;
              }
          });

          return (
            <>
              <div className="flex justify-between items-center mb-1 border-b border-zinc-800 pb-2">
                 <h3 className="text-zinc-200 text-xs font-bold uppercase tracking-wider">{viewMode === 'city' ? 'City' : 'Node'} Stats</h3>
                 <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Total: {counts.total}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-3 bg-blue-500 rounded-sm"></div>
                  <span className="text-sm font-medium text-zinc-300">Car</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{counts.car}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-3 bg-amber-500 rounded-sm"></div>
                  <span className="text-sm font-medium text-zinc-300">Bus</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{counts.bus}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-3 bg-purple-500 rounded-sm"></div>
                  <span className="text-sm font-medium text-zinc-300">Truck</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{counts.truck}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-full ml-1"></div>
                  <span className="text-sm font-medium text-zinc-300 ml-0.5">Bike</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{counts.bike}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-3 bg-red-500 rounded-sm shadow-[0_0_12px_rgba(239,68,68,0.8)]"></div>
                  <span className="text-sm font-medium text-zinc-300">Ambulance</span>
                </div>
                <span className="text-sm font-mono text-zinc-400">{counts.ambulance}</span>
              </div>
            </>
          );
        })()}
      </div>
      
      <div className="flex flex-col items-center gap-4 w-full h-full max-h-[85vh]">
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-zinc-950/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-zinc-800 shadow-xl z-30">
          <div className={`w-3 h-3 rounded-full ${state.is_running ? 'bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
          <span className="text-sm font-bold tracking-widest text-emerald-400">Time: {state.step}s</span>
        </div>

        <div className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded-3xl shadow-2xl relative overflow-hidden flex-1 aspect-square flex items-center justify-center w-full max-w-4xl group">
          <canvas 
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`rounded-2xl w-full h-full object-contain mix-blend-lighten ${viewMode === 'city' ? 'cursor-pointer' : 'cursor-default'}`}
          />
        </div>
        <p className="text-zinc-500 text-sm font-medium">
          {viewMode === 'city' ? 'Click any intersection to zoom in — ' : ''}
          Real-time Intersection Visualization Engine.
        </p>
      </div>
    </div>
  );
}
