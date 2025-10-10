import asyncio
from typing import Dict
from fastapi import WebSocket

class JobChannel:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.done = asyncio.Event()

class WSManager:
    def __init__(self):
        self._jobs: Dict[str, JobChannel] = {}

    def get_or_create_channel(self, job_id: str) -> JobChannel:
        if job_id not in self._jobs:
            self._jobs[job_id] = JobChannel()
        return self._jobs[job_id]

    async def publish(self, job_id: str, message: dict):
        chan = self.get_or_create_channel(job_id)
        await chan.queue.put(message)

    async def mark_done(self, job_id: str):
        chan = self.get_or_create_channel(job_id)
        chan.done.set()

    async def stream(self, job_id: str, websocket: WebSocket):
        chan = self.get_or_create_channel(job_id)
        try:
            while True:
                # Önce sıradaki mesajları tüket
                try:
                    msg = await asyncio.wait_for(chan.queue.get(), timeout=1.0)
                    await websocket.send_json(msg)
                except asyncio.TimeoutError:
                    pass
                # Bittiyse done + çık
                if chan.done.is_set() and chan.queue.empty():
                    break
        finally:
            # temizlik: işi bittiğinde kanalı kaldırmak istersen:
            self._jobs.pop(job_id, None)

ws_manager = WSManager()
