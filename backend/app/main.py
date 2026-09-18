import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.routers import auth, appointments, users, records, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Establish MongoDB connection pool on startup
    await connect_to_mongo()
    yield
    # Safely close connection pool on shutdown
    await close_mongo_connection()


app = FastAPI(
    title="MedCore HMS API",
    description="Hospital Management System REST API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# --- CORS Configuration ---
# Read allowed origins from environment variable, falling back to standard local Vite dev ports
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins = [origin.strip() for origin in env_origins.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Global Exception Handlers ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic 422 validation errors into cleaner client messages."""
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        errors.append({"field": field or "body", "message": err.get("msg")})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Request validation failed", "errors": errors},
    )


# --- API Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(appointments.router)
app.include_router(records.router)
app.include_router(billing.router)


# --- Health & Diagnostic Check ---
@app.get("/health", tags=["Health Check"])
async def health_check():
    """Confirms backend service health and active database connectivity."""
    db_status = "connected"
    try:
        db = get_db()
        # Ping the MongoDB server to verify live connection
        await db.command("ping")
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "MedCore HMS Backend",
        "database": db_status,
    }