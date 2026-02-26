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

        self.vehicle_types = ["car", "truck", "bus", "bike", "ambulance"]
        # Realistic probabilities: 70% cars, 10% trucks, 5% buses, 14% bikes, 1% ambulances
        self.vehicle_weights = [0.70, 0.10, 0.05, 0.14, 0.01]
        
        # Vehicle clearance cost (how many "steps" it roughly takes to clear this vehicle)
        # Using this to model delayed throughput rather than a simple pop
        self.vehicle_clearance_cost = {
            "car": 1.0,
            "truck": 2.5, # Trucks take longer to accelerate and clear
            "bus": 2.0,
            "bike": 0.5,
            "ambulance": 1.0,
        }
        
        # We need to track the current "clearance delay" for the active lane to model heavy vehicles
        self.lane_clearance_timers = {k: 0.0 for k in self.lanes.keys()}
        
        # New configurable for right vs left hand driving
        self.drive_side = "right"

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
        # DEFAULT EMERGENCY OVERRIDE:
        # If an ambulance exists, always force phase to clear that lane immediately regardless of AI math.
        ambulance_lane = None
        for lane, queue in self.lanes.items():
            if any(v["type"] == "ambulance" for v in queue):
                ambulance_lane = lane
                break
        
        if ambulance_lane:
            if "N_" in ambulance_lane or "S_" in ambulance_lane:
                if "left" in ambulance_lane: action = 1
                else: action = 0
            else:
                if "left" in ambulance_lane: action = 3
                else: action = 2
                    
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
                # Decrement the clearance timer for this lane
                if self.lane_clearance_timers[lane] <= 0:
                   # Pop the vehicle and calculate its specific cost to set the timer
                   vehicle = self.lanes[lane].pop(0)
                   cleared.append(vehicle)
                   self.lane_clearance_timers[lane] = self.vehicle_clearance_cost[vehicle["type"]]
                else:
                   self.lane_clearance_timers[lane] -= 1.0 # Standard tick
                   
        # Reset timers for non-active lanes so they start fresh when green
        for lane in self.lanes.keys():
            if lane not in active_lanes:
                self.lane_clearance_timers[lane] = 0.0

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
        # OPTIMIZED RL REWARD FUNCTION
        # Instead of just queue length, we penalize the actual aggregated delay.
        # This forces the agent to service lanes that have been waiting the longest, avoiding starvation.
        # We use a quadratic penalty for individual wait times to harshly punish outliers.
        
        delay_penalty = 0
        ambulance_penalty = 0
        
        for queue in self.lanes.values():
            for v in queue:
                wait_sec = v["wait_time"]
                if v["type"] == "ambulance":
                    ambulance_penalty += (wait_sec ** 1.5) * 10.0 # Extreme priority
                else:
                    delay_penalty += (wait_sec ** 1.2) * 0.1 # Non-linear scaling avoids single lanes waiting forever

        reward = -delay_penalty - ambulance_penalty

        # Positive reward for clearing vehicles (encourages throughput)
        # Give higher reward for clearing heavily delayed vehicles
        for v in cleared_vehicles:
             reward += 5.0 + (v["wait_time"] * 0.2)
        
        return reward
