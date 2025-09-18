import express from "express";
import axios from "axios";

const router = express.Router();

// Point this to FastAPI backend
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// ✅ Start interview
router.post("/start", async (req, res) => {
  try {
    console.log("📤 Sending to FastAPI /start:", req.body);
    const response = await axios.post(`${AI_SERVICE_URL}/start`, req.body);
    console.log("✅ Response from FastAPI /start:", response.data);
    res.json(response.data);
  } catch (err) {
    console.error("❌ FastAPI /start error:", err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: "start failed" });
  }
});

// ✅ Submit answer
router.post("/answer", async (req, res) => {
  try {
    console.log("📤 Sending to FastAPI /answer:", req.body);
    const response = await axios.post(`${AI_SERVICE_URL}/answer`, req.body);
    console.log("✅ Response from FastAPI /answer:", response.data);
    res.json(response.data);
  } catch (err) {
    console.error("❌ FastAPI /answer error:", err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: "answer failed" });
  }
});
