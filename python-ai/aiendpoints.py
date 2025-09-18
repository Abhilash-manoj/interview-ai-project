import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import StartRequest, AnswerRequest, QuestionResponse
from aiservices import build_graph

app = FastAPI()


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

sessions = {}

graph_instance = build_graph()
# -------------------- FastAPI Endpoints --------------------
@app.post("/start", response_model=QuestionResponse)
def start_interview_endpoint(req: StartRequest):
    session_id = str(uuid.uuid4())

    # Pass inputs inside the state dictionary
    initial_state = {
        "name": req.name,
        "interview_type": req.interview_type,
        "question_count": 0,
        "answers": [],
        "feedback": [],
        "current_question": "",
        "latest_answer": "",
        "summary": ""
    }

    # Invoke nodes
    state = graph_instance.invoke(initial_state)

    # Save session
    sessions[session_id] = state

    return QuestionResponse(
        session_id=session_id,
        question=state["current_question"]
    )

@app.post("/answer", response_model=QuestionResponse)
def answer_endpoint(req: AnswerRequest):
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state = sessions[req.session_id]

    # Add the user's answer to the state dict
    state["latest_answer"] = req.answer

    # Invoke the nodes in order
    state = graph_instance.invoke(state)

    # Check if interview finished
    if state.get("__branch__") == "summary":
        state = graph_instance.invoke(state)
        sessions.pop(req.session_id)
        return QuestionResponse(
            session_id=req.session_id,
            question="Interview Finished",
            summary=state.get("summary")
        )

    # Update session
    sessions[req.session_id] = state

    return QuestionResponse(
        session_id=req.session_id,
        question=state["current_question"],
        feedback=state.get("feedback", [])[-1] if state.get("feedback") else None
    )