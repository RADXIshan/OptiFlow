import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

@app.get("/")
def read_root():
    return JSONResponse({"message": "Server is Live"}, status_code=200)
