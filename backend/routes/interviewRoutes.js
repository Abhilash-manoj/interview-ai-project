import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import Interview from "../models/Interviewchat.js"; // ✅ Import the model

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
});

// -------------------------------------------------------------
// 🚀 Start Interview (Talks to AI AND Saves to MongoDB)
// -------------------------------------------------------------
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

    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/start`, 
      form,
      { headers: { ...form.getHeaders() } }
    );

    const { session_id, current_question } = response.data;
    console.log("AI Brain Response Data:", response.data);

    // 💾 FORWARD TO MONGODB: Create the initial record
    try {
      console.log("!!! ATTEMPTING MONGO SAVE !!! Session:", session_id);
      const newInterview = new Interview({
        session_id,
        name: name || "Candidate",
        interview_type: interview_type || "HR",
        max_questions: max_questions || 3,
        questions: [{
          question_number: 1,
          question_text: current_question,
          answer: "",
          feedback: { assessment: "" }
        }]
      });
      await newInterview.save();
      console.log("✅ MONGO SAVE SUCCESSFUL");
    } catch (dbError) {
      console.error("❌ MONGO SAVE ERROR:", dbError.message);
    }

    res.json({ session_id, current_question });
  } catch (error) {
    console.error("❌ Error in /start route:", error.message);
    next(error);
  }
});

// -------------------------------------------------------------
// 🚀 Submit Answer (Talks to AI AND Updates MongoDB)
// -------------------------------------------------------------
router.post("/answer", async (req, res, next) => {
  try {
    const { session_id, latest_answer } = req.body;
    
    // 1. Get response from AI
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL}/answer`, 
      { session_id, latest_answer },
      { headers: { "Content-Type": "application/json" } }
    );

    const { feedback, current_question, question_count, summary } = response.data;

    try {
      // 🚩 THE FIX: Update the LAST question's answer first, THEN push the next question
      // We find the document and update the 'answer' of the last element in the questions array
      await Interview.updateOne(
        { session_id, "questions.answer": "" }, 
        { 
          $set: { 
            "questions.$.answer": latest_answer,
            "questions.$.feedback": feedback 
          } 
        }
      );

      // 💾 Now, if there is a next question, push it as a fresh empty slot
      if (!summary && current_question) {
        await Interview.updateOne(
          { session_id },
          {
            $push: {
              questions: {
                question_number: question_count + 1,
                question_text: current_question,
                answer: "", // Waiting for the next turn
                feedback: { assessment: "" }
              }
            }
          }
        );
      } else if (summary) {
        // If the interview is over, just save the final summary
        await Interview.updateOne({ session_id }, { $set: { summary } });
      }

      console.log("✅ MONGO SYNC SUCCESSFUL");
    } catch (dbError) {
      console.error("❌ MONGO SYNC ERROR:", dbError.message);
    }

    res.json(response.data);

  } catch (error) {
    console.error("❌ Error in AI /answer communication:", error.message);
    next(error);
  }
});

router.get("/user-history", async (req, res) => {
  try {
    // 🔍 Find all interviews for the user (matched by name or user ID)
    // We sort by 'createdAt' so the most recent ones appear at the top
    const history = await Interview.find({ name: req.query.name }).sort({ createdAt: -1 });
    
    res.json(history);
  } catch (error) {
    console.error("❌ History Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to retrieve your audit history." });
  }
});

export default router;