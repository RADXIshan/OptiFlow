import os
import asyncio
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
    version="1.0.0",
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

# Global Simulation State
SIMULATION_RUNNING = False
SIMULATION_TASK = None
env = TrafficEnv() # the environment instance
rl_model = None

async def run_simulation_loop():
    global SIMULATION_RUNNING, env, rl_model
    
    # Initialize the model on first run
    if rl_model is None:
        try:
            rl_model = get_model()
        except Exception as e:
            print(f"Failed to load RL model: {e}")
            return
            
    obs, info = env.reset()
    
    while True:
        if SIMULATION_RUNNING:
            # RL model takes an action
            action, _states = rl_model.predict(obs, deterministic=True)
            
            # Step the environment
            obs, reward, terminated, truncated, info = env.step(action.item())
            
            # Broadcast state
            state_data = {
                "step": info["step"],
                "phase": env.current_phase,
                "reward": reward,
                "lanes": env.lanes, # detailed info on queues
                "vehicles": [v for q in env.lanes.values() for v in q], # flat list for easy stats
            }
            await manager.broadcast(state_data)
            
            if terminated or truncated:
                obs, info = env.reset()
                
            # Tick every 0.2 seconds (5Hz)
            await asyncio.sleep(0.2)
        else:
            await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    global SIMULATION_RUNNING, SIMULATION_TASK
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
    return JSONResponse({"message": "Server is Live"}, status_code=200)
