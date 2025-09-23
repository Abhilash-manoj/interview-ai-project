// routes/interview.js
import express from "express";
import { startInterview, submitAnswer } from "../controllers/interviewController.js";

const router = express.Router();

// POST /api/interview/start
router.post("/start", async (req, res) => {
  try {
    console.log("Received /start request with body:", req.body);
    // 🔧 1. Destructure max_questions from the request body
    const { name, interview_type, max_questions } = req.body;

    // 🔧 2. Add max_questions to the validation check
    if (!name || !interview_type || !max_questions) {
      return res.status(400).json({ error: "Missing name, interview_type, or max_questions" });
    }

    // 🔧 3. Pass max_questions to the controller function
    const data = await startInterview(name, interview_type, max_questions);
    
    console.log("Routers:", data);
    res.json(data); // { session_id, name, current_question }
  } catch (err) {
      console.error("🔥 Error in /start route:", {
        message: err.message,
        code: err.code,
        request_config: err.config,
      });
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/interview/answer (NO CHANGES NEEDED HERE)
router.post("/answer", async (req, res) => {
  try {
    console.log("Received /answer request with body:", req.body);
    const { session_id, latest_answer } = req.body;

    if (!session_id || !latest_answer) {
      return res.status(400).json({ error: "Missing session_id or answer" });
    }

    const data = await submitAnswer(session_id, latest_answer);
    console.log("Routers:", data);
    res.json(data);
  } catch (err) {
        console.error("🔥 Error in /answer route:", {
        message: err.message,
        code: err.code,
        request_config: err.config,
      });
      res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;