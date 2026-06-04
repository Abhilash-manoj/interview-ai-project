import logging
import uuid
import io
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

# Import your models and graphs
from models import Feedback, Summary, StartInterviewResponse, AnswerResponse, AnswerRequest
from aiservices import start_graph, continue_graph # Import both graphs and memory
from pypdf import PdfReader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("audit-ai")

app = FastAPI(title="Mock Interview AI")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error caught: {str(exc)}", exc_info=True) # Logs full traceback
    
    # Check if it's a known Rate Limit issue from Gemini
    if "429" in str(exc):
        return JSONResponse(
            status_code=429,
            content={"error": "RATE_LIMIT", "message": "AI is busy. Please wait 60 seconds."}
        )
        
    return JSONResponse(
        status_code=500,
        content={"error": "INTERNAL_ERROR", "message": "The audit engine hit a snag. Please retry."}
    )

@app.get("/health")
async def health_check():
    """
    Simple endpoint for pinger services to keep the server awake 
    and for Render to monitor service health.
    """
    return JSONResponse(
        content={"status": "online", "service": "Audit.AI Engine"}, 
        status_code=200
    )


# -------------------------------------------------------------
# 🚀 Start Endpoint (Uses start_graph)
# -------------------------------------------------------------
@app.post("/start", response_model=StartInterviewResponse)
async def start(
    name: str = Form(...), 
    interview_type: str = Form(...), 
    max_questions: int = Form(3),
    resume: Optional[UploadFile] = File(None)
):
    extracted_text = ""
    if resume:
        try:
            content = await resume.read()
            pdf_reader = PdfReader(io.BytesIO(content))
            extracted_text = " ".join([page.extract_text() for page in pdf_reader.pages])
            print(f"✅ Resume processed: {len(extracted_text)} chars.")
        except Exception as e:
            print(f"⚠️ PDF Error: {e}")

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "name": name,
        "interview_type": interview_type,
        "max_questions": max_questions,
        "question_count": 0,
        "resume_text": extracted_text,
        "answers": [],
        "feedback": []
    }

    # Use the START graph for the first call
    final_state = start_graph.invoke(initial_state, config)

    return StartInterviewResponse(
        session_id=thread_id,
        name=name,
        current_question=final_state["current_question"]
    )

# -------------------------------------------------------------
# 🚀 Answer Endpoint (Uses continue_graph)
# -------------------------------------------------------------
@app.post("/answer", response_model=AnswerResponse)
async def answer(req: AnswerRequest):
    """
    Resumes the session using continue_graph.
    This graph runs: evaluate_answer -> generate_next_question -> should_continue
    """
    config = {"configurable": {"thread_id": req.session_id}}

    try:
        # We invoke the continue_graph with the new answer.
        # LangGraph retrieves the previous state automatically via thread_id.
        updated_state = continue_graph.invoke(
            {"latest_answer": req.latest_answer}, 
            config
        )
    except Exception as e:
        print(f"❌ Graph Error: {e}")
        raise HTTPException(status_code=500, detail="AI failed to process answer.")

    # In your new graph:
    # If the interview continues, feedback and current_question are updated.
    # If the interview ends, summary is populated.
    
    latest_feedback = updated_state["feedback"][-1] if updated_state.get("feedback") else None
    
    return AnswerResponse(
        session_id=req.session_id,
        current_question=updated_state.get("current_question"),
        feedback=latest_feedback, 
        summary=updated_state.get("summary"),
        question_count=updated_state.get("question_count", 0)
    )