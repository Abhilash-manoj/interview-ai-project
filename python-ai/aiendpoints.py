import uuid
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

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

class AnswerRequest(BaseModel):
    session_id: str
    latest_answer: str

class AnswerResponse(BaseModel):
    session_id: str
    name: str | None = None
    current_question: str | None = None
    feedback: str | None = None
    summary: str | None = None
    question_count: int

# 🔧 2. Import the compiled graph objects from your services file
from aiservices import start_graph, continue_graph

app = FastAPI(
    title="Mock Interview AI Agent",
    description="API for conducting a mock interview with a LangGraph-powered agent."
)

# In-memory session storage (for demonstration purposes)
sessions = {}

# -------------------------------------------------------------
# 🔧 3. Update the /start endpoint
# -------------------------------------------------------------
@app.post("/start", response_model=StartInterviewResponse)
def start(req: StartInterviewRequest):
    """Initializes a new interview session."""
    # Create the initial state from the request
    initial_state = {
        "name": req.name,
        "interview_type": req.interview_type,
        "max_questions": req.max_questions
    }

    # 🔧 Use the new start_graph to initialize the state and get the first question
    final_state = start_graph.invoke(initial_state)

    # Generate a unique session ID and store the state
    session_id = str(uuid.uuid4())
    sessions[session_id] = final_state
    print(f"✅ Session started: {session_id} for user {req.name}")

    response = StartInterviewResponse(
        session_id=session_id,
        name=req.name,
        current_question=final_state["current_question"]
    )
    print("🔧 Returning StartInterviewResponse:", response.dict())
    return response

# -------------------------------------------------------------
# 🔧 4. Update the /answer endpoint
# -------------------------------------------------------------
@app.post("/answer", response_model=AnswerResponse)
def answer(req: AnswerRequest):
    """Processes a user's answer and gets the next question or summary."""
    # Retrieve the current state for the session
    current_state = sessions.get(req.session_id)
    if not current_state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update the state with the user's latest answer
    current_state["latest_answer"] = req.latest_answer

    # 🔧 Use the new continue_graph for the main conversational loop
    new_state = continue_graph.invoke(current_state)

    # Save the updated state back into the session storage
    sessions[req.session_id] = new_state
    print(f"🔄 Session updated: {req.session_id}")

    # 🔧 Get the most recent feedback from the feedback list
    latest_feedback = new_state["feedback"][-1] if new_state.get("feedback") else None

    response = AnswerResponse(
        session_id=req.session_id,
        name=new_state.get("name"),
        current_question=new_state.get("current_question"),
        feedback=latest_feedback, # Use the latest feedback item
        summary=new_state.get("summary"),
        question_count=new_state.get("question_count", 0)
    )
    print("🔧 Returning AnswerResponse:", response.dict())
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to the Mock Interview AI Agent API"}