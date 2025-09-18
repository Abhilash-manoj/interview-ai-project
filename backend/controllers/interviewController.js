import axios from "axios";

function makeClient() {
  const url = process.env.AI_SERVICE_URL;
  console.log("🌍 Using AI_SERVICE_URL:", url);

  if (!url) {
    throw new Error("AI_SERVICE_URL is not set in .env");
  }

  return axios.create({
    baseURL: url,
    timeout: 15000, // OWASP: avoid hanging
    validateStatus: (s) => s >= 200 && s < 500
  });
}

export const startInterview = async (req, res) => {
  try {
    const { name, interview_type } = req.body;

    const client = makeClient();
    const py = await client.post(
      "/start",
      { name, interview_type },
      {
        headers: {
          "X-API-Key": process.env.FASTAPI_INTERNAL_KEY || "",
          "Content-Type": "application/json"
        }
      }
    );

    if (py.status !== 200) {
      console.error("FastAPI /start error:", py.data);
      return res.status(py.status).json(py.data); // forward actual error
    }
    return res.json(py.data);
  } catch (e) {
    console.error("startInterview failed:", e.message);
    return res.status(500).json({ error: "Failed to start interview" });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { session_id, answer } = req.body;

    const client = makeClient();
    const py = await client.post(
      "/answer",
      { session_id, answer },
      {
        headers: {
          "X-API-Key": process.env.FASTAPI_INTERNAL_KEY || "",
          "Content-Type": "application/json"
        }
      }
    );

    if (py.status !== 200) {
      console.error("FastAPI /answer error:", py.data);
      return res.status(py.status).json(py.data);
    }
    return res.json(py.data);
  } catch (e) {
    console.error("submitAnswer failed:", e.message);
    return res.status(500).json({ error: "Failed to submit answer" });
  }
};
