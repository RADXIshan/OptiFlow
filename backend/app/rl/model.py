import os
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from app.env.traffic_env import TrafficEnv

# Directory to save the model
MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "ppo_traffic.zip")

def get_model():
    """
    Returns a loaded PPO model if it exists, otherwise creates a new one.
    """
    env = TrafficEnv()
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    if os.path.exists(MODEL_PATH):
        print("Loading existing PPO model...")
        model = PPO.load(MODEL_PATH, env=env)
    else:
        print("Creating new PPO model...")
        model = PPO("MlpPolicy", env, verbose=1)
    
    return model

def train_model(timesteps=10000):
    """
    Trains the PPO model and saves it.
    """
    env = TrafficEnv()
    model = get_model()
    model.set_env(env)
    print(f"Training for {timesteps} timesteps...")
    model.learn(total_timesteps=timesteps)
    model.save(MODEL_PATH)
    print("Model saved to", MODEL_PATH)

if __name__ == "__main__":
    train_model()
