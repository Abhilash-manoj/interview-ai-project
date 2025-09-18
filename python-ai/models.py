from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

# Store ongoing sessions in memory (or use DB like MongoDB)
sessions = {}
class StartRequest(BaseModel):
    name: str
    interview_type: str  # HR, Technical, Behavioral

class AnswerRequest(BaseModel):
    session_id: str
    answer: str

class QuestionResponse(BaseModel):
    session_id: str
    question: str
    feedback: str | None = None
    summary: str | None = None
