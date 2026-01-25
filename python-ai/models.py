from pydantic import BaseModel, Field
from typing import List, TypedDict, Optional

# --- 1. Structured Output Models ---
# These are used by the LLM to provide structured JSON
from pydantic import BaseModel, Field
from typing import List, Optional

class Feedback(BaseModel):
    # Purely conversational/technical assessment without a numeric score
    assessment: str = Field(description="A blunt paragraph assessing the quality of the specific answer.")

class Summary(BaseModel):
    overall_performance: str = Field(description="A brutal audit of the entire session.")
    # Final consolidated scores
    interview_score: int = Field(description="Final interview score (0-5) based on all answers.", ge=0, le=5)
    resume_score: int = Field(description="Final resume score (0-5). Must be 0 if no resume was provided.", ge=0, le=5)
    
    interview_coaching: str = Field(description="Blunt, actionable tips for interview improvement.")
    resume_coaching: str = Field(description="Blunt, actionable tips for resume improvement.")
    hiring_verdict: str = Field(description="Final decision: HIRED, WAITLISTED, or REJECTED.")

# --- 2. LangGraph State Definition ---
# This is the "internal memory" of your AI. 
# We added 'resume_text' so the nodes can access the extracted data.
class InterviewState(TypedDict):
    name: str
    interview_type: str
    max_questions: int
    question_count: int
    current_question: str
    latest_answer: str
    questions: List[str] # ✅ Added to track what was asked
    answers: List[str]
    feedback: List[Feedback]
    resume_text: Optional[str]
    summary: Optional[Summary]

# --- 3. API Request/Response Models ---
# Used for FastAPI endpoint validation
class StartInterviewRequest(BaseModel):
    name: str
    interview_type: str
    max_questions: int = 3

class StartInterviewResponse(BaseModel):
    session_id: str
    name: str
    current_question: str

class AnswerRequest(BaseModel):
    session_id: str
    latest_answer: str

class AnswerResponse(BaseModel):
    session_id: str
    current_question: Optional[str] = None
    feedback: Optional[Feedback] = None
    summary: Optional[Summary] = None # 💡 Now correctly uses the Summary model
    question_count: int