import uuid, asyncio
from fastapi import APIRouter, UploadFile, BackgroundTasks, HTTPException
from helpers.schemas import AssessInitResponse
from modules.parser_agent import parse_student_and_key
from modules.orchestrator import run_assessment_job

router = APIRouter()


@router.post("/assess", response_model=AssessInitResponse)
async def start_assessment(student_pdf: UploadFile, answer_key: UploadFile):
    # Basit içerik-türü ve isim kontrolü
    for f in (student_pdf, answer_key):
        if not f or not getattr(f, "filename", None):
            raise HTTPException(status_code=400, detail="PDF dosyaları yüklenemedi.")
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"Geçersiz dosya türü: {f.filename}. Lütfen PDF yükleyin.")
    job_id = str(uuid.uuid4())
    questions = parse_student_and_key(student_pdf, answer_key)

    # ✅ asenkron görev başlat
    asyncio.create_task(run_assessment_job(job_id, questions))

    return AssessInitResponse(job_id=job_id)
