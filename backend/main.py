from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routers import agent, evaluation, hedera, auth
# from routers import mlat  # Temporarily disabled due to websockets conflict
from api.intelligence import router as intelligence_router

load_dotenv()

app = FastAPI(title="SynapseWorth Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["evaluation"])
app.include_router(hedera.router, prefix="/api/hedera", tags=["hedera"])
# app.include_router(mlat.router, prefix="/api/mlat", tags=["mlat"])  # Temporarily disabled
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(intelligence_router)

@app.get("/")
async def root():
    return {"message": "SynapseWorth Backend API"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
