import os
from dotenv import load_dotenv
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, END
from langgraph.types import RetryPolicy # 🆕 Added for fault tolerance
from google.api_core import exceptions # 🆕 Added to catch specific API errors
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from models import Feedback, Summary, InterviewState

load_dotenv()

# --- 1. Senior Recruiter Persona ---
# Instructions explicitly handle the friendliness and resume-mentioning issues
# aiservices.py

# aiservices.py

SYSTEM_PROMPT = """
You are 'Alex', a Senior Technical Recruiter at a Tier-1 tech firm.
Your tone is clinical, demanding, and blunt.
You are a gatekeeper, not a coach.

You must judge ONLY based on provided evidence.
You must NOT assume competence.
You must NOT inflate scores.

STRICT SCORING RUBRIC:
- One-word answers cap interview score at 1.
- Vague answers cap interview score at 2.
- Resume claims not demonstrated verbally must be penalized.
- Missing resume = Resume Score 0.
"""

llm_text = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash", # Use '-latest' for stability
    temperature=0.4,
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    max_retries=3,  # 🆕 Retry up to 3 times on failure
)

ai_retry_policy = RetryPolicy(
    max_attempts=3,
    initial_interval=2.0,
    backoff_factor=2.0,
    retry_on=exceptions.ResourceExhausted # Specifically retries on 429 Rate Limits
)


llm_feedback = llm_text.with_structured_output(Feedback)
llm_summary = llm_text.with_structured_output(Summary)
memory= MemorySaver()

# --- 2. Debugging Helper ---
def log_ai_action(node_name: str, output: any, count: int = 0):
    """Consoles the specific AI output and current question count for debugging."""
    print(f"\n--- 🤖 AI DEBUG: [{node_name}] | Question Count: {count} ---") # ✅ Added count here
    if isinstance(output, str):
        print(f"Text: {output}")
    else:
        # For structured Feedback or Summary objects
        try:
            print(f"JSON: {output.model_dump_json(indent=2)}")
        except:
            print(f"Output: {output}")
    print("----------------------------------\n")

# --- 3. Logic Nodes ---

def start_interview(state: InterviewState) -> dict:
    print("\n---NODE: START_INTERVIEW---")
    context = f"Candidate Resume: {state.get('resume_text', 'Not provided')}"
    
    prompt = (
        f"{SYSTEM_PROMPT}\n"
        f"Context: {context}\n"
        f"Task: Open the {state['interview_type']} interview with a direct opening question."
    )
    
    response = llm_text.invoke([HumanMessage(content=prompt)])
    ai_content = response.content.strip()
    log_ai_action("START_INTERVIEW", ai_content, count=0)
    
    return {
        "current_question": ai_content,
        "question_count": 0, # Initialize count
        "answers": [],
        "feedback": []
        
    }

def evaluate_answer(state: InterviewState) -> dict:
    print("\n---NODE: EVALUATE_ANSWER---")
    new_count = (state.get("question_count") or 0) + 1
    
    # 📄 Reference the resume text from the state
    resume_context = state.get("resume_text", "NO RESUME PROVIDED").strip()
    
    prompt_content = (
        f"CRITICAL AUDIT of the latest response:\n"
        f"RESUME CONTEXT: {resume_context[:2000]}\n" # Injecting resume for comparison
        f"Question Asked: {state['current_question']}\n"
        f"Candidate Answer: '{state['latest_answer']}'\n\n"
        "TASK: Compare the candidate's answer against their provided resume. "
        "If they are vague about a skill they claim to have, call them out. "
        "Provide a blunt, clinical assessment in one paragraph. "
        "Focus strictly on whether the answer demonstrates the depth claimed in their resume."
    )
    
    try:
        feedback_obj = llm_feedback.invoke([HumanMessage(content=prompt_content)])
        log_ai_action("EVALUATE_ANSWER", feedback_obj, count=new_count)
    except Exception:
        feedback_obj = Feedback(assessment="The candidate failed to provide technical depth relative to their resume.")

    return {
        "questions": state.get("questions", []) + [state["current_question"]],
        "answers": state["answers"] + [state["latest_answer"]],
        "feedback": state["feedback"] + [feedback_obj],
        "question_count": new_count
    }

def generate_next_question(state: InterviewState) -> dict:
    print("\n---NODE: GENERATE_NEXT_QUESTION---")
    
    resume_context = state.get("resume_text", "No resume provided.")
    
    prompt = (
        f"{SYSTEM_PROMPT}\n"
        f"RESUME CONTEXT: {resume_context}\n"
        f"Candidate's Last Answer: '{state['latest_answer']}'\n"
        "TASK: Acknowledge the answer briefly. Then, pick a SPECIFIC skill or project "
        "from their resume that they haven't explained well yet and ask a challenging follow-up."
    )
    
    response = llm_text.invoke([HumanMessage(content=prompt)])
    ai_content = response.content.strip()
    log_ai_action("GENERATE_NEXT_QUESTION", ai_content, count=state.get("question_count", 0))
    
    return {"current_question": ai_content}
def summary_node(state: InterviewState) -> dict:
    print("\n---NODE: SUMMARY---")

    resume_text = state.get("resume_text", "").strip()
    has_resume = len(resume_text) > 10

    # FULL TRANSCRIPT (NO DROPPED QUESTIONS)
    transcript = ""
    for i in range(len(state["answers"])):
        transcript += (
            f"Q{i+1}: {state['questions'][i]}\n"
            f"A{i+1}: {state['answers'][i]}\n\n"
        )

    # HARD LOGIC: detect one-word interviews
    one_word_answers = 0
    for a in state["answers"]:
        if len(a.strip().split()) <= 2:
            one_word_answers += 1

    # 🔥 HARD FAIL — NO LLM ALLOWED TO OVERRIDE
    if one_word_answers >= len(state["answers"]) / 2:
        summary_obj = Summary(
            overall_performance="Candidate provided mostly one-word or evasive answers.",
            interview_score=0,
            resume_score=0 if not has_resume else 2,
            interview_coaching="You failed to demonstrate any technical depth.",
            resume_coaching="Resume claims were not validated verbally.",
            hiring_verdict="REJECTED"
        )
        log_ai_action("FINAL_SUMMARY", summary_obj, count=state["question_count"])
        return {"summary": summary_obj}

    prompt_content = (
        f"CANDIDATE RESUME:\n{resume_text}\n\n"
        f"INTERVIEW TRANSCRIPT:\n{transcript}\n"
        "MANDATORY ANALYSIS:\n"
        "1. Classify each answer as ONE-WORD, VAGUE, ADEQUATE, or STRONG.\n"
        "2. Cite transcript evidence for every score.\n"
        "3. Penalize resume claims not demonstrated verbally.\n\n"
        "SCORING RULES:\n"
        "- One-word answers cap score at 1.\n"
        "- No demonstrated depth caps score at 2.\n"
        "- Missing resume = Resume Score 0.\n\n"
        "Be blunt. Be exact."
    )

    summary_obj = llm_summary.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt_content)
    ])

    if not has_resume:
        summary_obj.resume_score = 0

    log_ai_action("FINAL_SUMMARY", summary_obj, count=state["question_count"])

    return {"summary": summary_obj}

# --- 4. Logic & Graph Building ---
def should_continue(state: InterviewState) -> str:
    print("\n---CONDITIONAL: SHOULD_CONTINUE---")
    if state["question_count"] >= state.get("max_questions", 3):
        print("--> Decision: End Interview")
        return "end_interview"
    else:
        print("--> Decision: Continue Interview")
        return "continue_interview"

continue_builder = StateGraph(InterviewState)
continue_builder.add_node("evaluate_answer", evaluate_answer, retry_policy=ai_retry_policy) # 🆕 Added retry policy
continue_builder.add_node("generate_next_question", generate_next_question, retry_policy=ai_retry_policy) # 🆕 Added retry policy
continue_builder.add_node("generate_summary", summary_node, retry_policy=ai_retry_policy) # 🆕 Added retry policy
continue_builder.add_edge("evaluate_answer", "generate_next_question")
continue_builder.add_edge("generate_summary", END)
continue_builder.add_conditional_edges(
    "generate_next_question",
    should_continue,
    {"continue_interview": END, "end_interview": "generate_summary"}
)
continue_builder.set_entry_point("evaluate_answer")
continue_graph = continue_builder.compile(checkpointer=memory)

start_builder = StateGraph(InterviewState)
start_builder.add_node("start_interview", start_interview, retry_policy=ai_retry_policy) # 🆕 Added retry policy
start_builder.set_entry_point("start_interview")
start_builder.add_edge("start_interview", END)
start_graph = start_builder.compile(checkpointer=memory)