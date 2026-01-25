import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/start", upload.single("resume"), async (req, res, next) => {
  try {
    const { name, interview_type, max_questions } = req.body;
    const form = new FormData();
    form.append("name", name || "Candidate");
    form.append("interview_type", interview_type || "HR");
    form.append("max_questions", max_questions || 3);

    if (req.file) {
      form.append("resume", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    // 🚀 Sending to Python
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/start`, 
      form,
      { headers: { ...form.getHeaders() } }
    );

    // 🕵️ Debugging: Add this to see exactly what Python sends
    console.log("AI Brain Response Data:", response.data);

    // ✨ FIX: Map the keys exactly as Python sends them
    res.json({
      session_id: response.data.session_id,   // Python uses 'session_id'
      current_question: response.data.current_question // Python uses 'current_question'
    });
  } catch (error) {
    console.error("❌ Error in /start route:", error.message);
    next(error);
  }
});

router.post("/answer", async (req, res, next) => {
  try {
    const { session_id, latest_answer } = req.body;

    // 🕵️ Debug: Check what's coming from React
    console.log(`💬 Processing answer for session: ${session_id}, latest_answer: ${latest_answer}`);

    // 🚀 Forwarding to Python AI
    // Ensure the keys { session_id, latest_answer } match your Python AnswerRequest model
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/answer`, 
      { 
        session_id: session_id, 
        latest_answer: latest_answer 
      },
      { headers: { "Content-Type": "application/json" } }
    );

    // 🕵️ Debug: Log AI's evaluation and next step
    console.log("🤖 AI Response received:", {
      hasQuestion: !!response.data.current_question,
      hasFeedback: !!response.data.feedback,
      hasSummary: !!response.data.summary
    });

    // ✨ Send the full data object (question, feedback, summary, count) to React
    // React's sendAnswer function expects this exact object
    res.json(response.data);

  } catch (error) {
    console.error("❌ Error in AI /answer communication:", error.response?.data || error.message);
    
    // Send a structured error so the frontend doesn't hang
    res.status(error.response?.status || 500).json({ 
      error: "The AI Brain failed to process your answer. Please try again." 
    });
  }
});

export default router;