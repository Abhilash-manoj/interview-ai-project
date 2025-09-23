import os
import json
from typing import List, TypedDict, Annotated, Optional
from models import Feedback
# ✨ NEW: Import BaseModel from Pydantic for structured output
from pydantic import BaseModel
from langgraph.graph import StateGraph, END
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# --- Setup ---
load_dotenv()
SYSTEM_PROMPT = "You are a helpful and insightful mock interviewer. Your goal is to ask relevant follow-up questions and provide constructive feedback. Keep your questions and feedback concise."

# 🔄 UPDATED: We will now have two LLM instances.
# 1. A standard LLM for generating plain text questions.
llm_text = ChatOllama(model="llama3", system=SYSTEM_PROMPT)

# 2. A specialized LLM that is FORCED to output JSON for feedback and summaries.
#    We will define the structure it must follow using a Pydantic model below.


# --- ✨ NEW: Define a Pydantic model for structured feedback ---
# This is more robust than a TypedDict for forcing model output structure.


# 🔄 UPDATED: The specialized JSON-output LLM chain
llm_json = llm_text.with_structured_output(Feedback)


# --- State Definition (Updated to use the Pydantic model) ---
class InterviewState(TypedDict):
    interview_type: str
    max_questions: int
    question_count: int
    current_question: str
    latest_answer: str
    answers: List[str]
    # 🔄 UPDATED: The feedback list now expects dictionary-like Pydantic objects
    feedback: List[Feedback]
    summary: Optional[Feedback]


# --- Debugging Helper (No changes needed here) ---
def debug_return_values(node_name: str, state: dict):
    """Prints a formatted view of the state being returned from a node."""
    print(f"\n<<< RETURNING FROM: {node_name} >>>")
    state_to_print = state.copy()
    if "answers" in state_to_print and state_to_print["answers"]:
        state_to_print["answers"] = f"[... {len(state_to_print['answers'])} answer(s) total. Last: '{state_to_print['answers'][-1][:50]}...']"
    if "feedback" in state_to_print and state_to_print["feedback"]:
        # Pydantic objects can be complex, so we convert them to dicts for clean printing
        feedback_list = [dict(item) for item in state_to_print['feedback']]
        state_to_print["feedback"] = f"[... {len(feedback_list)} feedback item(s) total. Last: '{feedback_list[-1]}...']"
    if "summary" in state_to_print and state_to_print["summary"]:
         state_to_print["summary"] = dict(state_to_print["summary"])

    print(json.dumps(state_to_print, indent=2))
    print("<<< -------------------- >>>")


# --- Graph Nodes ---
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
        "summary": None,
    }
    debug_return_values("start_interview", new_state)
    return new_state

def evaluate_answer(state: InterviewState) -> InterviewState:
    """Node to evaluate the user's answer and provide structured feedback."""
    print("\n---NODE: EVALUATE_ANSWER---")
    current_answers = state.get("answers", [])
    current_answers.append(state["latest_answer"])

    # 🔄 UPDATED: Simplified prompt. The structure is handled by the model itself.
    prompt_content = (
        f"You are an expert interviewer. Provide concise, constructive feedback on the following answer.\n\n"
        f"Question: {state['current_question']}\n\n"
        f"Answer: {state['latest_answer']}"
    )
    
    # 🔄 UPDATED: Use the JSON-enabled LLM and no more manual parsing!
    # The 'response' will be a dictionary-like object, not a string.
    try:
        feedback_obj = llm_json.invoke([HumanMessage(content=prompt_content)])
    except Exception as e:
        # Fallback in case of a more serious LLM error
        print(f"❌ ERROR: Failed to get structured feedback from AI. Error: {e}")
        feedback_obj = Feedback(strengths=["Failed to get feedback due to an AI error."], areas_for_improvement=[])

    current_feedback = state.get("feedback", [])
    current_feedback.append(feedback_obj)
    
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
    # 🔄 UPDATED: Use the standard text LLM for this node
    response = llm_text.invoke([HumanMessage(content=prompt)])
    
    new_state = {
        **state,
        "current_question": response.content.strip(),
        "question_count": state["question_count"] + 1,
    }
    debug_return_values("generate_next_question", new_state)
    return new_state

def summary_node(state: InterviewState) -> InterviewState:
    """Node to generate a final summary in a structured format."""
    print("\n---NODE: SUMMARY---")
    
    transcript = ""
    for i, (ans, fb) in enumerate(zip(state['answers'], state['feedback'])):
        # fb is now a Pydantic object, so we access attributes directly
        feedback_str = f"Strengths: {', '.join(fb.strengths)}\nAreas for Improvement: {', '.join(fb.areas_for_improvement)}"
        transcript += f"Answer {i+1}: {ans}\nFeedback {i+1}: {feedback_str}\n\n"

    # 🔄 UPDATED: Simplified prompt
    prompt_content = (
        f"Provide a final summary for this mock interview. Include two things the candidate did well, and one key area for improvement based on the transcript.\n\n"
        f"Transcript:\n{transcript}"
    )

    # 🔄 UPDATED: Use the JSON-enabled LLM for the summary
    try:
        summary_obj = llm_json.invoke([HumanMessage(content=prompt_content)])
    except Exception as e:
        print(f"❌ ERROR: Failed to get structured summary from AI. Error: {e}")
        summary_obj = Feedback(strengths=["Failed to parse summary from AI due to an error."], areas_for_improvement=[])
        
    new_state = {**state, "summary": summary_obj}
    debug_return_values("summary_node", new_state)
    return new_state

# --- Conditional Logic & Graph Definition (No changes needed here) ---
def should_continue(state: InterviewState) -> str:
    print("\n---CONDITIONAL: SHOULD_CONTINUE---")
    if state["question_count"] >= state.get("max_questions", 3):
        print("--> Decision: End Interview")
        return "end_interview"
    else:
        print("--> Decision: Continue Interview")
        return "continue_interview"

continue_builder = StateGraph(InterviewState)
continue_builder.add_node("evaluate_answer", evaluate_answer)
continue_builder.add_node("generate_next_question", generate_next_question)
continue_builder.add_node("summary", summary_node)
continue_builder.add_edge("evaluate_answer", "generate_next_question")
continue_builder.add_edge("summary", END)
continue_builder.add_conditional_edges(
    "generate_next_question",
    should_continue,
    {"continue_interview": END, "end_interview": "summary"}
)
continue_builder.set_entry_point("evaluate_answer")
continue_graph = continue_builder.compile()

start_builder = StateGraph(InterviewState)
start_builder.add_node("start_interview", start_interview)
start_builder.set_entry_point("start_interview")
start_builder.add_edge("start_interview", END)
start_graph = start_builder.compile()