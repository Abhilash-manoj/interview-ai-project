import os
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# Load env
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Init LLM
llm = ChatGoogleGenerativeAI(model="models/gemini-1.5-flash-latest", temperature=0.4)

# -------------------- LangGraph Nodes --------------------
def get_user_details(state: dict) -> dict:
    print("[DEBUG] Entering state: get_user_details")
    state["name"] = state["name"]
    state["type"] = state["interview_type"].capitalize()
    state["question_count"] = 0
    state["answers"] = []
    state["feedback"] = []
    return state

def start_interview(state: dict) -> dict:
    print("[DEBUG] Entering state: start_interview")
    type_map = {
        "HR": "Tell me about yourself.",
        "Technical": "Can you explain a technical project you've worked on?",
        "Behavioral": "Describe a time you faced a conflict at work or college."
    }
    state["current_question"] = type_map.get(state["type"], "Tell me about yourself.")
    return state

def get_user_answer(state: dict) -> dict:
    print("[DEBUG] Entering state: get_user_answer")
    if "latest_answer" not in state:
        return state  # no answer to process
    state["answers"].append(state["latest_answer"])
    state["question_count"] += 1
    return state

def evaluate_answer(state: dict) -> dict:
    print("[DEBUG] Entering state: evaluate_answer")
    if "latest_answer" not in state:
        return state
    prompt = f"Evaluate the following interview answer on clarity, relevance, and tone:\nAnswer: {state['latest_answer']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    feedback = response.content.strip()
    state["feedback"].append(feedback)
    return state

def generate_next_question(state: dict) -> dict:
    print("[DEBUG] Entering state: generate_next_question")
    prev = state["answers"][-1]
    prompt = f"You are a smart interviewer. Based on the previous answer, ask a follow-up {state['type']} interview question.\nPrevious answer: {prev}"
    response = llm.invoke([HumanMessage(content=prompt)])
    state["current_question"] = response.content.strip()
    return state

def interview_router(state: dict) -> dict:
    print("[DEBUG] Entering state: interview_router")
    if state.get("question_count", 0) >= 5:
        state["__branch__"] = "summary"
    else:
        state["__branch__"] = "get_user_answer"
    return state

def summary_node(state: dict) -> dict:
    print("[DEBUG] Entering state: summary_node")
    prompt = f"Summarize this mock interview session with an overall score and key feedback:\nAnswers: {state['answers']}\nFeedback: {state['feedback']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    state["summary"] = response.content.strip()
    return state

# -------------------- Build Graph --------------------
def build_graph():
    builder = StateGraph(dict)

    # Entry point for /start
    builder.set_entry_point("get_user_details")
    builder.add_node("get_user_details", get_user_details)
    builder.add_node("start_interview", start_interview)

    # Answer flow nodes
    builder.add_node("get_user_answer", get_user_answer)
    builder.add_node("evaluate_answer", evaluate_answer)
    builder.add_node("generate_next_question", generate_next_question)
    builder.add_node("interview_router", interview_router)
    builder.add_node("summary", summary_node)

    # Start flow
    builder.add_edge("get_user_details", "start_interview")

    # Answer flow
    builder.add_edge("start_interview", "get_user_answer")
    builder.add_edge("get_user_answer", "evaluate_answer")
    builder.add_edge("evaluate_answer", "generate_next_question")
    builder.add_edge("generate_next_question", "interview_router")

    builder.add_conditional_edges("interview_router", lambda state: state["__branch__"], {
        "get_user_answer": "get_user_answer",
        "summary": "summary"
    })

    builder.add_edge("summary", END)

    return builder.compile()

