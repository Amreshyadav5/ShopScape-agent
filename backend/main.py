import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.config import settings
from backend.seed import migrate_and_seed
from backend.routes.auth import router as auth_router
from backend.routes.products import router as products_router
from backend.routes.reviews import router as reviews_router
from backend.routes.cart import router as cart_router
from backend.routes.orders import router as orders_router
from backend.routes.agent import router as agent_router
from backend.routes.admin import router as admin_router

# Ensure database is migrated on startup
migrate_and_seed()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(products_router, prefix=settings.API_PREFIX)
app.include_router(reviews_router, prefix=settings.API_PREFIX)
app.include_router(cart_router, prefix=settings.API_PREFIX)
app.include_router(orders_router, prefix=settings.API_PREFIX)
app.include_router(agent_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)

# Mount resources directory for images
resources_path = os.path.join(settings.BASE_DIR, "resources")
if os.path.exists(resources_path):
    app.mount("/resources", StaticFiles(directory=resources_path), name="resources")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "store": settings.STORE_NAME,
        "version": settings.VERSION,
        "currency": settings.STORE_CURRENCY,
        "ai_provider": settings.DEFAULT_AI_PROVIDER
    }

@app.get("/api/config")
def get_store_config():
    return {
        "store_name": settings.STORE_NAME,
        "currency": settings.STORE_CURRENCY,
        "currency_symbol": settings.STORE_CURRENCY_SYMBOL,
        "shipping_flat_rate": settings.SHIPPING_FLAT_RATE,
        "free_shipping_threshold": settings.FREE_SHIPPING_THRESHOLD,
        "tax_rate": settings.TAX_RATE,
        "payment_provider": settings.PAYMENT_PROVIDER
    }

# Mount Frontend Dist if built
frontend_dist = os.path.join(settings.BASE_DIR, "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
