from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routes.assess import router as assess_router
from routes.ws import router as ws_router

app = FastAPI(title=settings.APP_NAME)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(assess_router, prefix="/api", tags=["assess"])
app.include_router(ws_router, tags=["ws"])

@app.get("/")
def root():
    return {"ok": True, "service": settings.APP_NAME}
