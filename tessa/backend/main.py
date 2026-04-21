"""
Tessa - Voice-First Desktop AI Assistant
FastAPI Backend Application
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from services.database import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup
    print("Starting Tessa backend...")

    # Connect to MongoDB
    if db_manager.connect():
        print("MongoDB connected successfully")
    else:
        print("WARNING: MongoDB connection failed - some features may not work")

    yield

    # Shutdown
    print("Shutting down Tessa backend...")


# Create FastAPI application
app = FastAPI(
    title="Tessa AI Assistant",
    description="Voice-first desktop AI assistant backend API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to Electron app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api", tags=["api"])


@app.get("/")
async def root():
    """Root endpoint - API info."""
    return {
        "name": "Tessa AI Assistant API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/health - System health check",
            "/api/chat - Send message to Tessa",
            "/api/conversations - Get conversation history",
            "/api/context - Get/set user context"
        ]
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    uvicorn.run("main:app", host=host, port=port, reload=True)
