from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class AssessInitResponse(BaseModel):
    job_id: str
    message: str = "Assessment started. Connect to WebSocket for progress."

class QuestionChunk(BaseModel):
    question_id: str
    student_answer: str
    key_answer: str

class QuestionResult(BaseModel):
    question_id: str
    score: float
    reasoning: str
    tips: Optional[str] = None

class AssessFinalSummary(BaseModel):
    total_score: float
    strengths: List[str]
    weaknesses: List[str]
    gaps: List[str]

class WSProgressMessage(BaseModel):
    type: str                    # "progress" | "summary" | "done" | "error"
    job_id: str
    payload: Dict[str, Any]      # QuestionResult veya final özet vs.
