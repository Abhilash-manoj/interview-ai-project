import os
import json
from typing import List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# --- Setup ---
load_dotenv()
SYSTEM_PROMPT = "You are a helpful and insightful mock interviewer. Your goal is to ask relevant follow-up questions and provide constructive feedback. Keep your questions and feedback concise."
llm = ChatOllama(model="llama3", system=SYSTEM_PROMPT)


# --- ✨ NEW: Debugging Helper for Return Values ✨ ---
def debug_return_values(node_name: str, state: dict):
    """Prints a formatted view of the state being returned from a node."""
    print(f"\n<<< RETURNING FROM: {node_name} >>>")
    
    # Create a copy for safe printing
    state_to_print = state.copy()

    # To avoid clutter, we'll summarize lists
    if "answers" in state_to_print and state_to_print["answers"]:
        state_to_print["answers"] = f"[... {len(state_to_print['answers'])} answer(s) total. Last: '{state_to_print['answers'][-1][:50]}...']"
    
    if "feedback" in state_to_print and state_to_print["feedback"]:
         state_to_print["feedback"] = f"[... {len(state_to_print['feedback'])} feedback item(s) total. Last: '{state_to_print['feedback'][-1][:50]}...']"
    
    print(json.dumps(state_to_print, indent=2))
    print("<<< -------------------- >>>")


# --- 1. State Definition (Using TypedDict for clarity) ---
class InterviewState(TypedDict):
    interview_type: str
    max_questions: int
    question_count: int
    current_question: str
    latest_answer: str
    answers: List[str]
    feedback: List[str]
    summary: Annotated[str, "The final summary of the interview."]


# --- 2. Graph Nodes (with debugging prints) ---
def start_interview(state: InterviewState) -> InterviewState:
    """Node to set up the first question of the interview."""
    print("\n---NODE: START_INTERVIEW---")
    type_map = {
        "HR": "Tell me about yourself.",
        "Technical": "Can you explain a technical project you've worked on in detail?",
        "Behavioral": "Describe a time you faced a significant conflict at work or college and how you resolved it."
    }
    question = type_map.get(state["interview_type"], "Tell me about yourself.")
    
    new_state = {
        **state,
        "current_question": question,
        "question_count": 1,
        "answers": [],
        "feedback": [],
    }
    debug_return_values("start_interview", new_state)
    return new_state

def evaluate_answer(state: InterviewState) -> InterviewState:
    """Node to evaluate the user's answer and provide feedback."""
    print("\n---NODE: EVALUATE_ANSWER---")
    current_answers = state.get("answers", [])
    current_answers.append(state["latest_answer"])

    prompt = (
        f"Question: {state['current_question']}\n\n"
        f"Answer: {state['latest_answer']}\n\n"
        f"Provide concise, constructive feedback on this answer."
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    feedback = response.content.strip()

    current_feedback = state.get("feedback", [])
    current_feedback.append(feedback)
    
    new_state = {
        **state,
        "answers": current_answers,
        "feedback": current_feedback,
    }
    debug_return_values("evaluate_answer", new_state)
    return new_state

def generate_next_question(state: InterviewState) -> InterviewState:
    """Node to generate the next interview question."""
    print("\n---NODE: GENERATE_NEXT_QUESTION---")
    prompt = (
        f"Based on the candidate's previous answer, ask a single, concise, and relevant follow-up {state['interview_type']} question.\n\n"
        f"Previous Answer: {state['latest_answer']}"
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    
    new_state = {
        **state,
        "current_question": response.content.strip(),
        "question_count": state["question_count"] + 1,
    }
    debug_return_values("generate_next_question", new_state)
    return new_state

def summary_node(state: InterviewState) -> InterviewState:
    """Node to generate a final summary."""
    print("\n---NODE: SUMMARY---")
    transcript = ""
    for i, (ans, fb) in enumerate(zip(state['answers'], state['feedback'])):
        transcript += f"Answer {i+1}: {ans}\nFeedback {i+1}: {fb}\n\n"

    prompt = (
        f"Provide a final summary for this mock interview. Include an overall score out of 10, two things the candidate did well, and one key area for improvement.\n\n"
        f"Transcript:\n{transcript}"
    )
    response = llm.invoke([HumanMessage(content=prompt)])
    
    new_state = {**state, "summary": response.content.strip()}
    debug_return_values("summary_node", new_state)
    return new_state


# --- 3. Conditional Logic ---
def should_continue(state: InterviewState) -> str:
    """Conditional edge to decide whether to continue or end."""
    print("\n---CONDITIONAL: SHOULD_CONTINUE---")
    if state["question_count"] > state.get("max_questions", 3):
        print("--> Decision: End Interview")
        return "end_interview"
    else:
        print("--> Decision: Continue Interview")
        return "continue_interview"


# --- 4. Graph Definition ---
# This graph is for CONTINUING the interview after an answer is given
continue_builder = StateGraph(InterviewState)
continue_builder.add_node("evaluate_answer", evaluate_answer)
continue_builder.add_node("generate_next_question", generate_next_question)
continue_builder.add_node("summary", summary_node)
continue_builder.add_edge("evaluate_answer", "generate_next_question")
continue_builder.add_edge("summary", END)
continue_builder.add_conditional_edges(
    "generate_next_question",
    should_continue,
    {
        "continue_interview": END,
        "end_interview": "summary"
    }
)
continue_builder.set_entry_point("evaluate_answer")
continue_graph = continue_builder.compile()

# This graph is just for starting the interview
start_builder = StateGraph(InterviewState)
start_builder.add_node("start_interview", start_interview)
start_builder.set_entry_point("start_interview")
start_builder.add_edge("start_interview", END)
start_graph = start_builder.compile()

