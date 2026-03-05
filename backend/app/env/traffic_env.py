import gymnasium as gym
from gymnasium import spaces
import numpy as np
import random

class Intersection:
    def __init__(self, r, c):
        self.r = r
        self.c = c
        self.current_phase = 0
        self.lanes = {
            f"{direction}_{lane}": [] 
            for direction in ["N", "S", "E", "W"] 
            for lane in ["left", "straight", "right"]
        }
        self.phase_time = 0
        self.is_transitioning = False
        self.current_transition_timer = 0
        self.next_phase = 0
        self.lane_clearance_timers = {k: 0.0 for k in self.lanes.keys()}

class TrafficEnv(gym.Env):
    """
    Custom Environment for a grid of intersections.
    """
    metadata = {"render_modes": ["human", "rgb_array"]}

    def __init__(self, rows=2, cols=2, render_mode=None):
        super(TrafficEnv, self).__init__()
        self.rows = rows
        self.cols = cols
        
        self.action_space = spaces.MultiDiscrete([4] * (rows * cols))
        
        low = np.zeros(rows * cols * 26, dtype=np.float32)
        high = np.ones(rows * cols * 26, dtype=np.float32) * 100
        self.observation_space = spaces.Box(low=low, high=high, dtype=np.float32)

        self.grid = {}
        for r in range(rows):
            for c in range(cols):
                self.grid[(r, c)] = Intersection(r, c)
                
        self.step_count = 0
        self.render_mode = render_mode
        self.last_cleared = []   # vehicles cleared in the most recent step
        self.manual_density: float | None = None  # None = use wave density

        self.vehicle_types = ["car", "truck", "bus", "bike", "ambulance"]
        self.vehicle_weights = [0.70, 0.10, 0.05, 0.14, 0.01]
        self.turn_choices = ["straight", "left", "right"]
        self.turn_weights = [0.70, 0.15, 0.15]
        
        self.vehicle_clearance_cost = {
            "car": 1.0, "truck": 2.5, "bus": 2.0, "bike": 0.5, "ambulance": 1.0,
        }
        
        self.drive_side = "right"
        self.min_green = 4
        self.max_green = 30
        self.transition_delay = 1

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.step_count = 0
        self.last_cleared = []
        
        for r in range(self.rows):
            for c in range(self.cols):
                inter = self.grid[(r, c)]
                inter.current_phase = 0
                inter.phase_time = 0
                inter.is_transitioning = False
                inter.current_transition_timer = 0
                inter.next_phase = 0
                inter.lane_clearance_timers = {k: 0.0 for k in inter.lanes.keys()}
                for k in inter.lanes.keys():
                    inter.lanes[k] = []

        return self._get_obs(), self._get_info()

    def step(self, action):
        self.step_count += 1
        self.last_cleared = []
        
        all_cleared = []
        transits = []
        
        idx = 0
        for r in range(self.rows):
            for c in range(self.cols):
                inter = self.grid[(r, c)]
                target_action = int(action[idx])
                idx += 1
                
                ambulance_lane = None
                for lane, queue in inter.lanes.items():
                    if any(v["type"] == "ambulance" for v in queue):
                        ambulance_lane = lane
                        break
                        
                if ambulance_lane:
                    if "N_" in ambulance_lane or "S_" in ambulance_lane:
                        target_action = 1 if "left" in ambulance_lane else 0
                    else:
                        target_action = 3 if "left" in ambulance_lane else 2

                if inter.is_transitioning:
                    inter.current_transition_timer -= 1
                    if inter.current_transition_timer <= 0:
                        inter.is_transitioning = False
                        inter.current_phase = inter.next_phase
                        inter.phase_time = 0
                else:
                    wants_to_switch = target_action != inter.current_phase
                    forced_switch = inter.phase_time >= self.max_green and not ambulance_lane
                    can_switch = inter.phase_time >= self.min_green or ambulance_lane
                    
                    if (wants_to_switch or forced_switch) and can_switch:
                        inter.is_transitioning = True
                        inter.current_transition_timer = self.transition_delay
                        inter.next_phase = target_action if wants_to_switch else ((inter.current_phase + 1) % 4)
                    else:
                        inter.phase_time += 1

                if not inter.is_transitioning:
                    cleared, moves = self._process_intersection_traffic(inter)
                    all_cleared.extend(cleared)
                    self.last_cleared.extend(cleared)
                    transits.extend(moves)

        for vehicle, dest_r, dest_c, arrival_dir in transits:
            if 0 <= dest_r < self.rows and 0 <= dest_c < self.cols:
                next_turn = random.choices(self.turn_choices, weights=self.turn_weights)[0]
                lane_key = f"{arrival_dir}_{next_turn}"
                vehicle["wait_time"] = 0
                if vehicle.get("is_anomaly"):
                    # Insert at the front of the next queue to "skip the line" visually at each intersection
                    self.grid[(dest_r, dest_c)].lanes[lane_key].insert(0, vehicle)
                else:
                    self.grid[(dest_r, dest_c)].lanes[lane_key].append(vehicle)

        wave_effect = np.sin(self.step_count / 50.0) * 0.1
        wave_density = max(0.05, 0.15 + wave_effect)
        current_density = self.manual_density if self.manual_density is not None else wave_density
        self._spawn_edge_vehicles(current_density)

        observation = self._get_obs()
        reward = self._calculate_reward(all_cleared)
        terminated = False
        truncated = self.step_count >= 1000
        info = self._get_info()

        return observation, reward, terminated, truncated, info

    def _process_intersection_traffic(self, inter):
        cleared = []
        transits = []
        
        active_lanes = []
        if inter.current_phase == 0:
            active_lanes = ["N_straight", "N_right", "S_straight", "S_right"]
        elif inter.current_phase == 1:
            active_lanes = ["N_left", "S_left"]
        elif inter.current_phase == 2:
            active_lanes = ["E_straight", "E_right", "W_straight", "W_right"]
        elif inter.current_phase == 3:
            active_lanes = ["E_left", "W_left"]

        # 1. Process anomalous vehicles ignoring red lights FIRST, 
        #    so they "skip the line" and go regardless of phase
        for lane in inter.lanes.keys():
            if inter.lanes[lane] and inter.lanes[lane][0].get("is_anomaly"):
                if inter.lane_clearance_timers[lane] <= 0:
                    vehicle = inter.lanes[lane].pop(0)
                    cleared.append(vehicle)
                    # Use a slightly longer clearance timer than 0.5 to make sure the user sees them running the red light
                    inter.lane_clearance_timers[lane] = self.vehicle_clearance_cost.get(vehicle["type"], 1.0) * 0.8
                    
                    r, c = inter.r, inter.c
                    if lane.startswith("N_"): 
                        if "straight" in lane: transits.append((vehicle, r+1, c, "N"))
                        elif "left" in lane: transits.append((vehicle, r, c+1, "W"))
                        elif "right" in lane: transits.append((vehicle, r, c-1, "E"))
                    elif lane.startswith("S_"): 
                        if "straight" in lane: transits.append((vehicle, r-1, c, "S"))
                        elif "left" in lane: transits.append((vehicle, r, c-1, "E"))
                        elif "right" in lane: transits.append((vehicle, r, c+1, "W"))
                    elif lane.startswith("E_"): 
                        if "straight" in lane: transits.append((vehicle, r, c-1, "E"))
                        elif "left" in lane: transits.append((vehicle, r+1, c, "N"))
                        elif "right" in lane: transits.append((vehicle, r-1, c, "S"))
                    elif lane.startswith("W_"): 
                        if "straight" in lane: transits.append((vehicle, r, c+1, "W"))
                        elif "left" in lane: transits.append((vehicle, r-1, c, "S"))
                        elif "right" in lane: transits.append((vehicle, r+1, c, "N"))
                else:
                    inter.lane_clearance_timers[lane] -= 1.0

        # 2. Process normal traffic in active phase
        for lane in active_lanes:
            if inter.lanes[lane]:
                if inter.lane_clearance_timers[lane] <= 0:
                    vehicle = inter.lanes[lane].pop(0)
                    cleared.append(vehicle)
                    inter.lane_clearance_timers[lane] = self.vehicle_clearance_cost[vehicle["type"]]
                    
                    r, c = inter.r, inter.c
                    if lane.startswith("N_"): 
                        if "straight" in lane: transits.append((vehicle, r+1, c, "N"))
                        elif "left" in lane: transits.append((vehicle, r, c+1, "W"))
                        elif "right" in lane: transits.append((vehicle, r, c-1, "E"))
                    elif lane.startswith("S_"): 
                        if "straight" in lane: transits.append((vehicle, r-1, c, "S"))
                        elif "left" in lane: transits.append((vehicle, r, c-1, "E"))
                        elif "right" in lane: transits.append((vehicle, r, c+1, "W"))
                    elif lane.startswith("E_"): 
                        if "straight" in lane: transits.append((vehicle, r, c-1, "E"))
                        elif "left" in lane: transits.append((vehicle, r+1, c, "N"))
                        elif "right" in lane: transits.append((vehicle, r-1, c, "S"))
                    elif lane.startswith("W_"): 
                        if "straight" in lane: transits.append((vehicle, r, c+1, "W"))
                        elif "left" in lane: transits.append((vehicle, r-1, c, "S"))
                        elif "right" in lane: transits.append((vehicle, r+1, c, "N"))
                else:
                    inter.lane_clearance_timers[lane] -= 1.0
                    
        for lane in inter.lanes.keys():
            if lane not in active_lanes and not (inter.lanes[lane] and inter.lanes[lane][0].get("is_anomaly")):
                inter.lane_clearance_timers[lane] = 0.0

        return cleared, transits

    def _spawn_edge_vehicles(self, base_density):
        for r in range(self.rows):
            for c in range(self.cols):
                if random.random() < base_density:
                    # Allow spawning on the edges facing outwards
                    available_dirs = []
                    if r == 0: available_dirs.append("N")
                    if r == self.rows - 1: available_dirs.append("S")
                    if c == 0: available_dirs.append("W")
                    if c == self.cols - 1: available_dirs.append("E")
                    
                    if available_dirs:
                        spawn_dir = random.choice(available_dirs)
                        turn = random.choices(["straight", "left", "right"], weights=[0.4, 0.3, 0.3])[0]
                        lane = f"{spawn_dir}_{turn}"
                        v_type = random.choices(self.vehicle_types, weights=self.vehicle_weights)[0]
                        self.grid[(r, c)].lanes[lane].append({"type": v_type, "wait_time": 0})

    def _get_obs(self):
        obs = []
        for r in range(self.rows):
            for c in range(self.cols):
                inter = self.grid[(r, c)]
                for lane_name, queue in inter.lanes.items():
                    obs.append(len(queue))
                    ambulances = sum(1 for v in queue if v["type"] == "ambulance")
                    obs.append(ambulances)
                    for v in queue:
                        v["wait_time"] += 1
                obs.append(inter.current_phase)
                obs.append(1 if inter.is_transitioning else 0)
        return np.array(obs, dtype=np.float32)

    def _get_info(self):
        grid_state = {}
        for r in range(self.rows):
            for c in range(self.cols):
                inter = self.grid[(r, c)]
                grid_state[f"{r}_{c}"] = {
                    "lanes": inter.lanes,
                    "phase": int(inter.current_phase),
                    "is_transitioning": bool(inter.is_transitioning)
                }
        return {"step": int(self.step_count), "grid": grid_state}

    def _calculate_reward(self, all_cleared):
        delay_penalty = 0
        ambulance_penalty = 0
        
        for r in range(self.rows):
            for c in range(self.cols):
                inter = self.grid[(r, c)]
                for queue in inter.lanes.values():
                    for v in queue:
                        wait_sec = v["wait_time"]
                        if v["type"] == "ambulance":
                            # Strongly penalize ambulance wait
                            ambulance_penalty += (wait_sec ** 1.8) * 15.0
                        else:
                            # Higher exponent to penalize large localized delays heavily,
                            # forcing RL to balance intersections across the grid.
                            delay_penalty += (wait_sec ** 1.4) * 0.15

        reward = -delay_penalty - ambulance_penalty

        for v in all_cleared:
             reward += 5.0 + (v["wait_time"] * 0.3)
        
        return reward
