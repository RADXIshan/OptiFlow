from fastapi import APIRouter
from pydantic import BaseModel
import app.app as main_app  

router = APIRouter()

class SimulationConfig(BaseModel):
    traffic_density: float
    spawn_ambulance: bool = False
    drive_side: str | None = None

@router.post("/simulation/config")
async def update_simulation_config(config: SimulationConfig):
    # This endpoint updates the global simulation config
    if config.drive_side is not None:
        main_app.env.drive_side = config.drive_side
        
    if config.spawn_ambulance:
        # Spawn one ambulance in a random lane
        import random
        lane = random.choice(list(main_app.env.lanes.keys()))
        main_app.env.lanes[lane].append({"type": "ambulance", "wait_time": 0})
    return {"status": "success", "config": config.model_dump()}

@router.post("/simulation/start")
async def start_simulation():
    main_app.SIMULATION_RUNNING = True
    return {"status": "started"}

@router.post("/simulation/stop")
async def stop_simulation():
    main_app.SIMULATION_RUNNING = False
    return {"status": "stopped"}

@router.post("/simulation/reset")
async def reset_simulation():
    if not main_app.SIMULATION_RUNNING:
        main_app.env.reset()
        return {"status": "reset"}
    return {"status": "error", "message": "Engine must be halted to reset"}
