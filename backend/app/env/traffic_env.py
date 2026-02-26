import gymnasium as gym
from gymnasium import spaces
import numpy as np
import random

class TrafficEnv(gym.Env):
    """
    Custom Environment that follows gym interface for a simplistic 4-way single intersection.
    """
    metadata = {"render_modes": ["human", "rgb_array"]}

    def __init__(self, render_mode=None):
        super(TrafficEnv, self).__init__()
        
        # Action space: 
        # 0: North-South Green (Straight/Right)
        # 1: North-South Green (Left turn)
        # 2: East-West Green (Straight/Right)
        # 3: East-West Green (Left turn)
        self.action_space = spaces.Discrete(4)

        # Observation space:
        # A simplified state representation. For now we use a fixed size array
        # counting vehicles per lane + light state.
        # 4 approaches * 3 lanes (left, straight, right) = 12 queues.
        # We also want to know if there's an ambulance in any of these queues.
        # So we track: [queue_length, num_ambulances] for each of the 12 lanes.
        # Plus 1 integer for the current traffic light phase.
        # Total state size: 12 * 2 + 1 = 25
        low = np.zeros(25, dtype=np.float32)
        high = np.ones(25, dtype=np.float32) * 100 # arbitrary max
        self.observation_space = spaces.Box(low=low, high=high, dtype=np.float32)

        self.current_phase = 0
        self.lanes = {
            f"{direction}_{lane}": [] 
            for direction in ["N", "S", "E", "W"] 
            for lane in ["left", "straight", "right"]
        }
        self.step_count = 0
        self.render_mode = render_mode

        self.vehicle_types = ["car", "bus", "bike", "ambulance"]
        # Realistic probabilities: 80% cars, 5% buses, 14% bikes, 1% ambulances
        self.vehicle_weights = [0.80, 0.05, 0.14, 0.01]

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_phase = 0
        self.step_count = 0
        
        for k in self.lanes.keys():
            self.lanes[k] = []

        # Initial random spawn
        self._spawn_vehicles(base_density=0.2)
        
        observation = self._get_obs()
        info = self._get_info()

        return observation, info

    def step(self, action):
        self.step_count += 1
        
        # Change phase
        self.current_phase = action

        # Process vehicle movements based on the current phase
        cleared_vehicles = self._process_traffic()

        # Spawn new vehicles with dynamic density (simulating rush hour waves)
        # Using a sine wave based on step count. At step 0, sine is 0, base_density is 0.1.
        # Max wave amplitude is 0.15, so density fluctuates between 0.1 and 0.25
        wave_effect = np.sin(self.step_count / 50.0) * 0.1
        current_density = max(0.05, 0.15 + wave_effect)
        self._spawn_vehicles(base_density=current_density)

        observation = self._get_obs()
        reward = self._calculate_reward(cleared_vehicles)
        terminated = False # continuous environment
        truncated = self.step_count >= 1000
        info = self._get_info()

        return observation, reward, terminated, truncated, info

    def _process_traffic(self):
        cleared = []
        # Simplified traffic logic: clear 1 vehicle per step for active green lanes
        active_lanes = []
        if self.current_phase == 0:
            active_lanes = ["N_straight", "N_right", "S_straight", "S_right"]
        elif self.current_phase == 1:
            active_lanes = ["N_left", "S_left"]
        elif self.current_phase == 2:
            active_lanes = ["E_straight", "E_right", "W_straight", "W_right"]
        elif self.current_phase == 3:
            active_lanes = ["E_left", "W_left"]

        for lane in active_lanes:
            if self.lanes[lane]:
                cleared.append(self.lanes[lane].pop(0))
                
        # Non-active lanes: wait time increases (we can model this by just penalizing queue length)
        return cleared

    def _spawn_vehicles(self, base_density=0.1):
        for lane in self.lanes.keys():
            if random.random() < base_density:
                v_type = random.choices(self.vehicle_types, weights=self.vehicle_weights)[0]
                self.lanes[lane].append({"type": v_type, "wait_time": 0})

    def _get_obs(self):
        obs = []
        for lane_name, queue in self.lanes.items():
            obs.append(len(queue))
            ambulances = sum(1 for v in queue if v["type"] == "ambulance")
            obs.append(ambulances)
            
            # Increment wait times
            for v in queue:
                v["wait_time"] += 1

        obs.append(self.current_phase)
        return np.array(obs, dtype=np.float32)

    def _get_info(self):
        return {"step": self.step_count, "lanes": self.lanes}

    def _calculate_reward(self, cleared_vehicles):
        # Base penalty for total queue length (negative reward)
        total_queued = sum(len(q) for q in self.lanes.values())
        reward = -total_queued * 0.1 

        # Heavy penalty for ambulances waiting
        ambulance_wait = 0
        for queue in self.lanes.values():
            for v in queue:
                if v["type"] == "ambulance":
                    ambulance_wait += v["wait_time"]
                    
        reward -= ambulance_wait * 5.0 # High penalty!

        # Positive reward for clearing vehicles (optional, encourages throughput)
        reward += len(cleared_vehicles) * 1.0
        
        return reward
