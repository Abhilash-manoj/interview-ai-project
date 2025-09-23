import axios from "axios";
import Interview from "../models/Interviewchat.js"; // Adjust the path as needed

function makeClient() {
  const url = process.env.AI_SERVICE_URL;
  console.log("🌍 Using AI_SERVICE_URL:", url);

  if (!url) throw new Error("AI_SERVICE_URL is not set in .env");

  return axios.create({
    baseURL: url,
    timeout: 60000,
    validateStatus: (s) => s >= 200 && s < 500,
  });
}

// ✅ Start Interview with Database Save
export const startInterview = async (name, interview_type, max_questions = 3) => {
  const client = makeClient();
  const py = await client.post(
    "/start",
    { name, interview_type, max_questions },
    {
      headers: {
        "X-API-Key": process.env.FASTAPI_INTERNAL_KEY || "",
        "Content-Type": "application/json",
      },
    }
  );

  const { session_id, current_question } = py.data;

  // 💾 Save the new interview session to the database
  try {
    const newInterview = new Interview({
      session_id,
      name,
      interview_type,
      max_questions,
      questions: [{
        question_number: 1,
        question_text: current_question,
        answer: "", // No answer yet for the first question
        feedback: { strengths: [], areas_for_improvement: [] }
      }]
    });
    await newInterview.save();
    console.log("✅ New interview session saved:", session_id);
  } catch (error) {
    console.error("❌ Error saving new interview:", error);
  }

  console.log("Received Content:", py.data);
  return py.data;
};

// ✅ Submit Answer with Database Update
export const submitAnswer = async (session_id, latest_answer) => {
  if (!session_id || !latest_answer) {
    throw new Error("Missing session_id or latest_answer");
  }

  const client = makeClient();
  const py = await client.post(
    "/answer",
    { session_id, latest_answer },
    {
      headers: {
        "X-API-Key": process.env.FASTAPI_INTERNAL_KEY || "",
        "Content-Type": "application/json",
      },
    }
  );

  // 🔄 The AI now returns structured data, so we can use it directly
  const { feedback, current_question, question_count, summary } = py.data;

  // 🔄 Update the existing interview session in the database
  try {
    const updatedInterview = await Interview.findOneAndUpdate(
      { session_id },
      {
        $push: {
          questions: {
            question_number: question_count,
            question_text: current_question,
            answer: latest_answer,
            feedback, // Directly use the object from the API response
          },
        },
        $set: { summary }, // Directly use the object from the API response
      },
      { new: true } // Return the updated document
    );
    console.log("✅ Interview session updated:", updatedInterview.session_id);
  } catch (error) {
    console.error("❌ Error updating interview:", error);
  }

  console.log("Received Content:", py.data);
  return py.data;
};
