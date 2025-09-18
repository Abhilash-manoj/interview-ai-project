import os
import getpass
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
load_dotenv()

import os
api_key = os.getenv("GOOGLE_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="models/gemini-1.5-flash-latest",
    temperature=0.2
)


def get_symptom(state: dict) -> dict:
    symptom = input("Welcome to XYZ hospital, Please enter your symptom: ")
    state["symptom"] = symptom
    return state

def classify_symptom(state: dict) -> dict:
    prompt = (
        "You are a helpful Medical Assistant, Classify the symptoms below into one of the categories \n"
        "-General \n-Emergency \n-Mental health \n"
        f"Symptom : {state['symptom']} \n"
        "Respond only with one word : General, Emergency Or Mental Health\n"
        "#Example : input : I have fever, Output : General"
    )
    
    response = llm.invoke([HumanMessage(content=prompt)])
    category = response.content.strip()
    print(f"LLM classifies the symptom as : {category}")  # debug
    state["category"] = category
    return state

def symptom_router(state: dict) -> dict:
    cat = state["category"].lower()  # General, general, Mental, mental

    if "general" in cat:
        return "general"
    elif "emergency" in cat:
        return "emergency"
    elif "mental" in cat:
        return "mental_health"
    else:
        return "general"

def general_node(state: dict) -> dict:
    state["answer"] = f"{state['symptom']} : seems general : directing you to general ward for consulting a doctor"
    return state

def emergency_node(state: dict) -> dict:
    state["answer"] = f"{state['symptom']} : It is a Medical Emergency : seeking immediate help"
    return state

def mental_health_node(state: dict) -> dict:
    state["answer"] = f"{state['symptom']} : seems like a medical health issue: talk to our counsellor"
    return state

builder = StateGraph(dict)

# Define the nodes
builder.set_entry_point("get_symptom")
builder.add_node("get_symptom", get_symptom)
builder.add_node("classify", classify_symptom)
builder.add_node("general", general_node)
builder.add_node("emergency", emergency_node)
builder.add_node("mental_health", mental_health_node)

# Define transitions
builder.add_edge("get_symptom", "classify")
builder.add_conditional_edges("classify", symptom_router, {
    "general": "general",
    "emergency": "emergency",
    "mental_health": "mental_health"
})

builder.add_edge("general", END)
builder.add_edge("emergency", END)
builder.add_edge("mental_health", END)
 
graph = builder.compile()
final_state = graph.invoke({})
print("Final Output\n")
print(final_state["answer"])
