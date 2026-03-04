# OptiFlow

OptiFlow is an advanced, Reinforcement Learning-based traffic management AI and simulation system. It intelligently optimizes traffic light phases across a grid of intersections to minimize congestion, reduce wait times, and prioritize emergency vehicles (like ambulances) using real-time state evaluations.

The system connects a high-performance Python simulation engine (powered by Stable-Baselines3 and FastAPI) with a sleek, real-time React frontend dashboard (built with Vite and TailwindCSS), offering live analytics, dynamic AI controls, and interactive traffic visualizations.

## 🚀 Features

### Core AI & Simulation (Backend)
- **Reinforcement Learning Engine**: Utilizes Proximal Policy Optimization (PPO) via `stable-baselines3` to train an agent capable of dynamic traffic light control.
- **Custom Gymnasium Environment**: Implements a highly configurable 2D intersection grid (`TrafficEnv`) managing real-world constraints such as phase transitions, clearance costs for different vehicle types (cars, trucks, buses, bikes), and turning probabilities.
- **Emergency Vehicle Priority**: Specialized reward shaping severely penalizes delays for ambulances, forcing the AI to dynamically clear paths for emergency responders.
- **Real-Time WebSockets Architecture**: Constant bidirectional data flow streaming grid states, vehicle coordinates, wait times, and alerts to connected clients.
- **Dynamic Wave Spawning & Manual Density**: Built-in traffic volume fluctuation (wave effect) simulating peak hours, with an API to manually override traffic density.
- **Live Alerting**: Automatically dispatches WebSocket alerts for critical events, such as severe congestion nodes (>30 queued vehicles) and ambulance detections.

### Interactive Dashboard (Frontend)
- **Live Traffic Simulation**: Real-time rendering of intersections, distinct vehicle types, and traffic light phases driven by WebSocket state updates.
- **Dashboard Analytics**: Top-level statistical oversight including total active vehicles, accumulating wait times, cleared vehicle counts, and system performance metrics using dynamic charts.
- **AI Controls**: A dedicated control panel to manually tweak simulation speed (time dilation) and traffic density on the fly.
- **Modern UI/UX**: Built with React 19 and TailwindCSS v4. Features responsive layouts, dark/light mode toggles, micro-animations, and toast notifications for system alerts (`sonner`).

---

## 🛠 Technologies Used

### Backend
- **Core Framework**: FastAPI (REST API & WebSockets)
- **RL Framework**: Stable-Baselines3 (PPO Algorithm), PyTorch
- **Environment**: Gymnasium
- **Math/Data**: NumPy
- **Server**: Uvicorn

### Frontend
- **Core Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4
- **Data Visualization**: Recharts
- **Notifications**: Sonner

---

## 🧠 Architecture & Methodology

### 1. The Environment (`app/env/traffic_env.py`)
The custom environment is a configurable grid of `Intersection` nodes. Each node possesses lanes representing directional inputs (N, S, E, W) and turn paths (straight, left, right).
Vehicle movements incur "clearance costs" tied to their type (e.g., trucks take longer to clear than bikes).
The reward function minimizes a polynomial of wait times, heavily weighed to discourage localized bottlenecks and strongly deter emergency vehicle delays.

### 2. The RL Model (`app/rl/model.py`)
A generalized MLP Policy PPO model observes queue lengths, ambulance presences, and current signal phases at every intersection. It outputs multivariable discrete actions corresponding to the desired next phase (0, 1, 2, 3) for each intersection. If a phase change is selected, a realistic transition delay (yellow light) is applied.

### 3. State Broadcasting (`app/api/websocket.py` & `app.py`)
An asynchronous event loop constantly iterates the `env.step()`. Upon each step, it compiles JSON state data (vehicle lists, active phases, step count, metrics, etc.) and fires it rapidly to all listening websocket clients. 

### 4. The UI (`frontend/src/`)
A `useSimulationSocket` hook intercepts the firehose of WebSocket data, maintaining local React state for rendering. `App.jsx` serves as the shell layout, holding top-level navigation, the live alert banner, metrics "pills", and routing between specific feature views.

---

## 📂 File Tree Structure

```text
OptiFlow/
├── backend/                  # Python FastAPI & RL Simulation
│   ├── app/
│   │   ├── api/
│   │   │   ├── rest.py       # REST endpoints (Stats, DB sync, etc)
│   │   │   └── websocket.py  # Real-time connection management
│   │   ├── env/
│   │   │   ├── traffic_env.py# Custom Gymnasium traffic logic
│   │   │   └── __init__.py
│   │   ├── rl/
│   │   │   ├── model.py      # PPO model initialization and training
│   │   │   └── saved_models/ # Persistent weights (.zip files)
│   │   ├── app.py            # Main FastAPI instantiation & Loop
│   │   └── __init__.py
│   ├── main.py               # Uvicorn entry point
│   ├── pyproject.toml        # Backend dependencies & metadata
│   ├── requirements.txt      # Pip requirement lock
│   └── vercel.json           # Optional Vercel deployment config
│
├── frontend/                 # React TS/JS Vite App
│   ├── public/               # Static assets (logo.png, etc)
│   ├── src/
│   │   ├── components/       # UI Views (Dashboard, Simulation, Controls)
│   │   ├── hooks/            # Custom hooks (useSimulationSocket)
│   │   ├── App.jsx           # Main layout, Routing, Nav drawer
│   │   ├── index.css         # Tailwind directives & overrides
│   │   └── main.jsx          # React DOM mounting
│   ├── eslint.config.js      # Linting configuration
│   ├── package.json          # Frontend dependencies & scripts
│   ├── vite.config.js        # Vite build tool configuration
│   └── vercel.json           # Frontend hosting configuration
│
└── README.md                 # You are here!
```

---

## ⚙️ Setup & Installation

### Prerequisites
- **Python** `>=3.12`
- **Node.js** `>=18.x`

### 1. Start the Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows
pip install -r requirements.txt
# Alternatively, install via standard pip or uv:
# pip install fastapi uvicorn gymnasium stable-baselines3 torch websockets python-dotenv

# Run the backend server
python main.py
# Or using uvicorn directly:
# uvicorn app.app:app --reload --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at:
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000`
