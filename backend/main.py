from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.config_routes import router as config_router
from routes.analyze_routes import router as analyze_router
from routes.deep_dive_routes import router as deep_dive_router
from config.env_loader import load_env_vars
from dotenv import load_dotenv
load_dotenv()


app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_env_vars()

app.include_router(config_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")
app.include_router(deep_dive_router, prefix="/api")

@app.get("/ping")
def ping():
    return {"message": "pong"} 