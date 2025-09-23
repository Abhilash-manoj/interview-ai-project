from pydantic import BaseModel
from typing import List, TypedDict, Annotated, Optional

# --- 1. State Definition (Using TypedDict for clarity) ---
# ⚠️ We've updated the types for feedback and summary to be structured objects
class Feedback(BaseModel):
    strengths: List[str]
    areas_for_improvement: List[str]

class AnswerResponse(BaseModel):
    session_id: str
    name: str | None = None
    current_question: str | None = None
    feedback: Optional[Feedback] = None
    summary: Optional[Feedback] = None
    question_count: int


# Assume your models.py and aiservices.py are in the same directory
# 🔧 1. Define Pydantic models directly here for clarity
class StartInterviewRequest(BaseModel):
    name: str
    interview_type: str
    max_questions: int = 3 # 🔧 Add max_questions to the request

class StartInterviewResponse(BaseModel):
    session_id: str
    name: str
    current_question: str

# ⚠️ Updated Pydantic models to match the new structured output
class Feedback(BaseModel):
    strengths: List[str]
    areas_for_improvement: List[str]

class AnswerResponse(BaseModel):
    session_id: str
    name: str | None = None
    current_question: str | None = None
    feedback: Optional[Feedback] = None
    summary: Optional[Feedback] = None
    question_count: int

class AnswerRequest(BaseModel):
    session_id: str
    latest_answer: str