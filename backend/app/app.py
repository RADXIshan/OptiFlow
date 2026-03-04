import os
import asyncio
import time
from collections import deque
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.websocket import router as websocket_router, manager
from app.api.rest import router as rest_router
from app.rl.model import get_model
from app.env.traffic_env import TrafficEnv

load_dotenv()

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")

app = FastAPI(
    title="OptiFlow Backend",
    description="OptiFlow Backend API",
    version="2.0.0",
)

origins = [
    CLIENT_URL,
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(websocket_router, tags=["websocket"])
app.include_router(rest_router, prefix="/api", tags=["rest"])

# ── Global Simulation State ──────────────────────────────────────────────────
SIMULATION_RUNNING = False
SIMULATION_TASK = None
env = TrafficEnv()           # environment instance
rl_model = None

# Speed multiplier: divide base sleep time by this.
# 0.25 = very slow, 1.0 = normal, 4.0 = fast
SIMULATION_SPEED: float = 1.0
BASE_SLEEP: float = 0.8          # seconds per step at 1×

# Manual density override (None = use wave default)
MANUAL_DENSITY: float | None = None

# ── Session Stats ─────────────────────────────────────────────────────────────
SESSION_START_TIME: float = time.time()
TOTAL_VEHICLES_CLEARED: int = 0
TOTAL_STEPS: int = 0
TOTAL_WAIT_ACCUMULATED: float = 0.0  # sum of all vehicle wait_times cleared

# ── Live Alerts ───────────────────────────────────────────────────────────────
# Each event alert: {"type": str, "message": str, "ts": float}
EVENT_ALERTS: deque = deque(maxlen=50)
# Each state alert: {"type": str, "message": str, "ts": float}
STATE_ALERTS: dict = {}

def _push_alert(alert_type: str, message: str):
    EVENT_ALERTS.appendleft({"type": alert_type, "message": message, "ts": time.time()})


# ── Simulation Loop ───────────────────────────────────────────────────────────
async def run_simulation_loop():
    global SIMULATION_RUNNING, env, rl_model
    global TOTAL_VEHICLES_CLEARED, TOTAL_STEPS, TOTAL_WAIT_ACCUMULATED

    if rl_model is None:
        try:
            rl_model = get_model()
        except Exception as e:
            print(f"Failed to load RL model: {e}")
            return

    obs, info = env.reset()

    while True:
        try:
            if SIMULATION_RUNNING:
                action, _states = rl_model.predict(obs, deterministic=True)
                obs, reward, terminated, truncated, info = env.step(action)

                # ── collect cleared stats ───────────────────────────────────
                cleared = env.last_cleared  # list of vehicle dicts
                TOTAL_VEHICLES_CLEARED += len(cleared)
                TOTAL_STEPS += 1
                for v in cleared:
                    TOTAL_WAIT_ACCUMULATED += v.get("wait_time", 0) * 0.8

                # ── detect alerts ───────────────────────────────────────────
                current_state_keys = set()
                
                for r in range(env.rows):
                    for c in range(env.cols):
                        inter = env.grid[(r, c)]
                        node_total = sum(len(q) for q in inter.lanes.values())
                        
                        # Severe congestion
                        if node_total > 30:
                            key = f"congestion_{r}_{c}"
                            current_state_keys.add(key)
                            if key not in STATE_ALERTS:
                                STATE_ALERTS[key] = {"type": "congestion", "message": f"Severe congestion at node ({r},{c}) — {node_total} vehicles queued", "ts": time.time()}
                            else:
                                STATE_ALERTS[key]["message"] = f"Severe congestion at node ({r},{c}) — {node_total} vehicles queued"

                        # Ambulance detected
                        amb_lane = None
                        for lane, queue in inter.lanes.items():
                            if any(v["type"] == "ambulance" for v in queue):
                                amb_lane = lane
                                break

                        if amb_lane is not None:
                            key = f"ambulance_{r}_{c}"
                            current_state_keys.add(key)
                            if key not in STATE_ALERTS:
                                STATE_ALERTS[key] = {"type": "ambulance", "message": f"🚨 Emergency vehicle detected at node ({r},{c}) in lane {amb_lane}", "ts": time.time()}
                            else:
                                STATE_ALERTS[key]["message"] = f"🚨 Emergency vehicle detected at node ({r},{c}) in lane {amb_lane}"

                keys_to_remove = [k for k in STATE_ALERTS.keys() if k not in current_state_keys]
                for k in keys_to_remove:
                    del STATE_ALERTS[k]

                # ── build and broadcast state ───────────────────────────────
                all_vehicles = []
                for r in range(env.rows):
                    for c in range(env.cols):
                        for q in env.grid[(r, c)].lanes.values():
                            all_vehicles.extend(q)

                state_data = {
                    "step": int(info["step"]),
                    "grid": info["grid"],
                    "reward": float(reward),
                    "vehicles": all_vehicles,
                    "drive_side": env.drive_side,
                    "is_running": True,
                    "speed": SIMULATION_SPEED,
                    "density": MANUAL_DENSITY,
                }
                await manager.broadcast(state_data)

                if terminated or truncated:
                    obs, info = env.reset()

                sleep_time = BASE_SLEEP / max(0.1, SIMULATION_SPEED)
                await asyncio.sleep(sleep_time)
            else:
                # Paused — broadcast current state
                grid_state = {}
                all_vehicles = []
                for r in range(env.rows):
                    for c in range(env.cols):
                        inter = env.grid[(r, c)]
                        grid_state[f"{r}_{c}"] = {
                            "lanes": inter.lanes,
                            "phase": int(inter.current_phase),
                            "is_transitioning": bool(inter.is_transitioning)
                        }
                        for q in inter.lanes.values():
                            all_vehicles.extend(q)

                state_data = {
                    "step": int(env.step_count),
                    "grid": grid_state,
                    "reward": 0.0,
                    "vehicles": all_vehicles,
                    "drive_side": env.drive_side,
                    "is_running": False,
                    "speed": SIMULATION_SPEED,
                    "density": MANUAL_DENSITY,
                }
                await manager.broadcast(state_data)
                await asyncio.sleep(1.0)
        except Exception as e:
            import traceback
            traceback.print_exc()
            await asyncio.sleep(2.0)


@app.on_event("startup")
async def startup_event():
    global SIMULATION_RUNNING, SIMULATION_TASK, SESSION_START_TIME
    SESSION_START_TIME = time.time()
    SIMULATION_RUNNING = True
    SIMULATION_TASK = asyncio.create_task(run_simulation_loop())


@app.on_event("shutdown")
async def shutdown_event():
    global SIMULATION_RUNNING, SIMULATION_TASK
    SIMULATION_RUNNING = False
    if SIMULATION_TASK:
        SIMULATION_TASK.cancel()


@app.get("/")
def read_root():
    return JSONResponse({"message": "OptiFlow v2 — Server is Live"}, status_code=200)
