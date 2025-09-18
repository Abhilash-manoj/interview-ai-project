import os
import getpass
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
load_dotenv()

# Load environment variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="models/gemini-1.5-flash-latest",
    temperature=0.4
)

# 🧩 Entry Node: Get User Details
def get_user_details(state: dict) -> dict:
    name = input("Enter your name: ")
    interview_type = input("Choose interview type (HR, Technical, Behavioral): ").strip().capitalize()
    state["name"] = name
    state["type"] = interview_type
    state["question_count"] = 0
    state["answers"] = []
    state["feedback"] = []
    return state

# 🎯 Start Interview
def start_interview(state: dict) -> dict:
    type_map = {
        "HR": "Tell me about yourself.",
        "Technical": "Can you explain a technical project you've worked on?",
        "Behavioral": "Describe a time you faced a conflict at work or college."
    }
    question = type_map.get(state["type"], "Tell me about yourself.")
    state["current_question"] = question
    print(f"Interviewer: {question}")
    return state

# 🗣️ Get User Answer
def get_user_answer(state: dict) -> dict:
    answer = input("Your Answer: ")
    state["answers"].append(answer)
    state["question_count"] += 1
    state["latest_answer"] = answer
    return state

# 📝 Evaluate Answer
def evaluate_answer(state: dict) -> dict:
    prompt = f"Evaluate the following interview answer on clarity, relevance, and tone:\nAnswer: {state['latest_answer']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    feedback = response.content.strip()
    state["feedback"].append(feedback)
    print(f"Feedback: {feedback}")
    return state

# ❓ Generate Next Question
def generate_next_question(state: dict) -> dict:
    prev = state["answers"][-1]
    prompt = f"You are a smart interviewer. Based on the previous answer, ask a follow-up {state['type']} interview question.\nPrevious answer: {prev}"
    response = llm.invoke([HumanMessage(content=prompt)])
    next_q = response.content.strip()
    state["current_question"] = next_q
    print(f" Interviewer: {next_q}")
    return state

# 🔁 Router: Ask More or Summarize
def interview_router(state: dict) -> dict:
    if not isinstance(state, dict):
        print(f"🚨 ERROR: Expected dict, got {type(state)} with value: {state}")
        state = {"__branch__": "summary"}  # fallback
        return state

    question_count = state.get("question_count", 0)

    if question_count >= 5:
        state["__branch__"] = "summary"
    else:
        state["__branch__"] = "get_user_answer"

    return state



# 🧾 Summary
def summary_node(state: dict) -> dict:
    prompt = f"Summarize this mock interview session with an overall score and key feedback:\nAnswers: {state['answers']}\nFeedback: {state['feedback']}"
    response = llm.invoke([HumanMessage(content=prompt)])
    state["summary"] = response.content.strip()
    return state

# 🔧 Build the Graph
builder = StateGraph(dict)

# Nodes
builder.set_entry_point("get_user_details")
builder.add_node("get_user_details", get_user_details)
builder.add_node("start_interview", start_interview)
builder.add_node("get_user_answer", get_user_answer)
builder.add_node("evaluate_answer", evaluate_answer)
builder.add_node("generate_next_question", generate_next_question)
builder.add_node("interview_router", interview_router)
builder.add_node("summary", summary_node)

# Transitions
builder.add_edge("get_user_details", "start_interview")
builder.add_edge("start_interview", "get_user_answer")
builder.add_edge("get_user_answer", "evaluate_answer")
builder.add_edge("evaluate_answer", "generate_next_question")
builder.add_edge("generate_next_question", "interview_router")

builder.add_conditional_edges("interview_router", lambda state: state["__branch__"], {
    "get_user_answer": "get_user_answer",
    "summary": "summary"
})

builder.add_edge("summary", END)

# ✅ Compile and Run
graph = builder.compile()
final_state = graph.invoke({})

# 🎓 Show Final Summary
print("\n🎓 Final Summary:")
print(final_state["summary"])
