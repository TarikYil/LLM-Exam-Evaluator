from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from helpers.ws_manager import ws_manager

router = APIRouter()

@router.websocket("/ws/assess/{job_id}")
async def ws_assess(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        # bu job_id için kuyruktaki mesajları tüketip gönder
        await ws_manager.stream(job_id, websocket)
    except WebSocketDisconnect:
        # istemci bağlantıyı kapattı
        pass
    finally:
        await websocket.close()
