from fastapi import APIRouter
from pydantic import BaseModel
import app.app as main_app  # Notice we import to mutate global states if needed

router = APIRouter()

class SimulationConfig(BaseModel):
    traffic_density: float
    spawn_ambulance: bool = False

@router.post("/simulation/config")
async def update_simulation_config(config: SimulationConfig):
    # This endpoint updates the global simulation config
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
