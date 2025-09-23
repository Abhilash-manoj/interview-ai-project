import axios from "axios";

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

// ✅ Start Interview
// 🔧 1. Add `max_questions` parameter with a default value
export const startInterview = async (name, interview_type, max_questions = 3) => {
  const client = makeClient();
  const py = await client.post(
    "/start",
    // 🔧 2. Include `max_questions` in the request payload
    { name, interview_type, max_questions },
    {
      headers: {
        "X-API-Key": process.env.FASTAPI_INTERNAL_KEY || "",
        "Content-Type": "application/json",
      },
    }
  );
  console.log("Received Content:", py.data);
  return py.data; // { session_id, name, current_question }
};

// ✅ Submit Answer
export const submitAnswer = async (session_id, latest_answer) => {
  // 🔧 3. Fix the typo in the validation check
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
  console.log("Received Content:", py.data);
  return py.data;
  /*
    {
      session_id,
      name,
      current_question,
      feedback,
      summary,
      question_count
    }
  */
};