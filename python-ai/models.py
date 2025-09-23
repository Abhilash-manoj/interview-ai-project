from pydantic import BaseModel
from typing import Optional

class StartInterviewRequest(BaseModel):
    name: str
    interview_type: str

class StartInterviewResponse(BaseModel):
    session_id: str
    name: str
    current_question: str

class AnswerRequest(BaseModel):
    session_id: str
    latest_answer: str

class AnswerResponse(BaseModel):
    session_id: str
    name: str
    current_question: Optional[str] = None
    feedback: Optional[str] = None
    summary: Optional[str] = None
    question_count: int

    