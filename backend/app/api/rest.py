from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import app.app as main_app
import time
import random

router = APIRouter()


# ── Pydantic Models ───────────────────────────────────────────────────────────

class SimulationConfig(BaseModel):
    traffic_density: float = 0.15
    spawn_ambulance: bool = False
    spawn_anomaly: bool = False
    drive_side: Optional[str] = None

class SpeedConfig(BaseModel):
    multiplier: float  # 0.25 | 0.5 | 1.0 | 2.0 | 4.0

class DensityConfig(BaseModel):
    density: Optional[float] = None  # None = use wave; 0.0–1.0 = manual

class ScenarioConfig(BaseModel):
    scenario: str  # "default" | "rush_hour" | "night" | "incident"


# ── Existing Endpoints ────────────────────────────────────────────────────────

@router.post("/simulation/config")
async def update_simulation_config(config: SimulationConfig):
    if config.drive_side is not None:
        main_app.env.drive_side = config.drive_side

    if config.spawn_ambulance:
        r = random.randint(0, main_app.env.rows - 1)
        c = random.randint(0, main_app.env.cols - 1)
        inter = main_app.env.grid[(r, c)]
        lane = random.choice(list(inter.lanes.keys()))
        inter.lanes[lane].append({"type": "ambulance", "wait_time": 0})
        main_app._push_alert("ambulance", f"🚨 Emergency vehicle manually injected at node ({r},{c})")

    if config.spawn_anomaly:
        for _ in range(2):
            # Spawn near the center to make sure it stays on the grid long enough to be visible
            r = main_app.env.rows // 2
            c = main_app.env.cols // 2
            
            # Slightly fuzz the location if the grid is big enough
            if main_app.env.rows > 2:
                r += random.randint(-1, 1)
            if main_app.env.cols > 2:
                c += random.randint(-1, 1)
                
            r = max(0, min(main_app.env.rows - 1, r))
            c = max(0, min(main_app.env.cols - 1, c))
            
            inter = main_app.env.grid[(r, c)]
            
            # Prefer crossing lanes (straight/left) to show off skipping red lights
            lane_choices = [l for l in inter.lanes.keys() if "straight" in l or "left" in l]
            lane = random.choice(lane_choices) if lane_choices else random.choice(list(inter.lanes.keys()))
            
            vtype = random.choices(main_app.env.vehicle_types, weights=main_app.env.vehicle_weights)[0]
            
            # Insert at the FRONT of the queue to visually skip the line immediately
            inter.lanes[lane].insert(0, {"type": vtype, "wait_time": 0, "is_anomaly": True})
            
        main_app._push_alert("scenario", "⚠️ Rogue anomalies injected! Skipping lights and bypassing queues.")

    return {"status": "success", "config": config.model_dump()}

@router.post("/simulation/start")
async def start_simulation():
    main_app.SIMULATION_RUNNING = True
    main_app._push_alert("system", "▶️ Simulation engine started")
    return {"status": "started"}

@router.post("/simulation/stop")
async def stop_simulation():
    main_app.SIMULATION_RUNNING = False
    main_app._push_alert("system", "⏸️ Simulation engine halted")
    return {"status": "stopped"}

@router.post("/simulation/reset")
async def reset_simulation():
    if not main_app.SIMULATION_RUNNING:
        main_app.env.reset()
        # Reset session stats
        main_app.TOTAL_VEHICLES_CLEARED = 0
        main_app.TOTAL_STEPS = 0
        main_app.TOTAL_WAIT_ACCUMULATED = 0.0
        main_app.SESSION_START_TIME = time.time()
        main_app.EVENT_ALERTS.clear()
        main_app.STATE_ALERTS.clear()
        main_app._push_alert("system", "🔄 Environment reset — session stats cleared")
        return {"status": "reset"}
    return {"status": "error", "message": "Engine must be halted to reset"}


# ── New Endpoints ─────────────────────────────────────────────────────────────

@router.post("/simulation/speed")
async def set_simulation_speed(config: SpeedConfig):
    multiplier = max(0.1, min(8.0, config.multiplier))
    main_app.SIMULATION_SPEED = multiplier
    return {"status": "success", "speed": multiplier}

@router.post("/simulation/density")
async def set_density(config: DensityConfig):
    if config.density is None:
        main_app.env.manual_density = None
        main_app.MANUAL_DENSITY = None
    else:
        density = max(0.0, min(1.0, config.density))
        main_app.env.manual_density = density
        main_app.MANUAL_DENSITY = density
    return {"status": "success", "density": config.density}

@router.post("/simulation/scenario")
async def apply_scenario(config: ScenarioConfig):
    scenario = config.scenario

    if scenario == "rush_hour":
        main_app.env.manual_density = 0.55
        main_app.MANUAL_DENSITY = 0.55
        # Spawn some extra vehicles immediately
        for _ in range(8):
            r = random.randint(0, main_app.env.rows - 1)
            c = random.randint(0, main_app.env.cols - 1)
            inter = main_app.env.grid[(r, c)]
            lane = random.choice(list(inter.lanes.keys()))
            vtype = random.choices(
                main_app.env.vehicle_types,
                weights=main_app.env.vehicle_weights
            )[0]
            inter.lanes[lane].append({"type": vtype, "wait_time": 0})
        main_app._push_alert("scenario", "🌆 Rush Hour scenario activated — high density traffic")

    elif scenario == "night":
        main_app.env.manual_density = 0.04
        main_app.MANUAL_DENSITY = 0.04
        main_app._push_alert("scenario", "🌙 Night scenario activated — sparse traffic")

    elif scenario == "incident":
        main_app.env.manual_density = 0.35
        main_app.MANUAL_DENSITY = 0.35
        # Spawn 3 ambulances
        for _ in range(3):
            r = random.randint(0, main_app.env.rows - 1)
            c = random.randint(0, main_app.env.cols - 1)
            inter = main_app.env.grid[(r, c)]
            lane = random.choice(list(inter.lanes.keys()))
            inter.lanes[lane].append({"type": "ambulance", "wait_time": 0})
        main_app._push_alert("scenario", "🚨 Incident scenario — multiple emergency vehicles!")

    else:  # "default"
        main_app.env.manual_density = None
        main_app.MANUAL_DENSITY = None
        main_app._push_alert("scenario", "↩️ Default scenario restored — wave-pattern traffic")

    return {"status": "success", "scenario": scenario}

@router.get("/alerts")
async def get_alerts():
    alerts = list(main_app.STATE_ALERTS.values()) + list(main_app.EVENT_ALERTS)
    alerts.sort(key=lambda x: x["ts"], reverse=True)
    return {"alerts": alerts[:50]}

@router.get("/stats/session")
async def get_session_stats():
    uptime_seconds = int(time.time() - main_app.SESSION_START_TIME)

    # CO2 estimation: per-vehicle wait time * 0.00025 kg CO2 per second
    actual_co2 = main_app.TOTAL_WAIT_ACCUMULATED * 0.00025
    # Baseline: assume 90s avg wait per vehicle without RL
    baseline_co2 = main_app.TOTAL_VEHICLES_CLEARED * 90 * 0.00025
    co2_saved = max(0.0, baseline_co2 - actual_co2)

    return {
        "uptime_seconds": uptime_seconds,
        "total_vehicles_cleared": main_app.TOTAL_VEHICLES_CLEARED,
        "total_steps": main_app.TOTAL_STEPS,
        "co2_saved_kg": round(co2_saved, 3),
        "actual_co2_kg": round(actual_co2, 3),
        "efficiency_score": round(
            min(100.0, (co2_saved / max(0.001, baseline_co2)) * 100), 1
        ) if main_app.TOTAL_VEHICLES_CLEARED > 0 else 0.0,
        "avg_wait_per_vehicle": round(
            main_app.TOTAL_WAIT_ACCUMULATED / max(1, main_app.TOTAL_VEHICLES_CLEARED), 1
        ),
    }
