import streamlit as st
from langchain_core.messages import HumanMessage
from main2 import llm  # Reuse your Gemini model instance

# Session State Initialization
if "state" not in st.session_state:
    st.session_state.state = {
        "name": "",
        "type": "HR",
        "question_count": 0,
        "answers": [],
        "feedback": [],
        "current_question": "",
        "latest_answer": ""
    }

st.title("🎙️ AI Mock Interview Assistant")

# Sidebar for configuration
with st.sidebar:
    st.header("🛠️ Interview Setup")
    st.session_state.state["name"] = st.text_input("Your Name")
    st.session_state.state["type"] = st.selectbox("Interview Type", ["HR", "Technical", "Behavioral"])

# Start Interview Button
if st.session_state.state["question_count"] == 0:
    if st.button("🚀 Start Interview"):
        type_map = {
            "HR": "Tell me about yourself.",
            "Technical": "Can you explain a technical project you've worked on?",
            "Behavioral": "Describe a time you faced a conflict at work or college."
        }
        question = type_map.get(st.session_state.state["type"], "Tell me about yourself.")
        st.session_state.state["current_question"] = question
        st.success("Interview Started!")

# Show current question
if st.session_state.state["current_question"]:
    st.subheader("🤖 Interviewer:")
    st.markdown(f"> {st.session_state.state['current_question']}")

    # Input field for user's answer
    answer = st.text_area("🗣️ Your Answer:", key="answer_input")

    if st.button("📤 Submit Answer") and answer.strip():
        # Save the answer
        st.session_state.state["latest_answer"] = answer
        st.session_state.state["answers"].append(answer)
        st.session_state.state["question_count"] += 1

        # Get feedback
        prompt = f"Evaluate the following interview answer on clarity, relevance, and tone:\nAnswer: {answer}"
        response = llm.invoke([HumanMessage(content=prompt)])
        feedback = response.content.strip()
        st.session_state.state["feedback"].append(feedback)

        st.markdown("---")
        st.subheader("📋 Feedback:")
        st.write(feedback)

        # Generate follow-up question if < 5
        if st.session_state.state["question_count"] < 5:
            followup_prompt = f"You are a smart interviewer. Based on the previous answer, ask a follow-up {st.session_state.state['type']} interview question.\nPrevious answer: {answer}"
            followup = llm.invoke([HumanMessage(content=followup_prompt)])
            st.session_state.state["current_question"] = followup.content.strip()
        else:
            # End of interview, summarize
            st.session_state.state["current_question"] = ""
            summary_prompt = f"Summarize this mock interview session with an overall score and key feedback:\nAnswers: {st.session_state.state['answers']}\nFeedback: {st.session_state.state['feedback']}"
            final = llm.invoke([HumanMessage(content=summary_prompt)])
            st.subheader("🎓 Final Summary")
            st.write(final.content.strip())
