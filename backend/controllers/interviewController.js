import axios from "axios";
import Interview from "../models/Interviewchat.js"; 

// Helper for the AI client
const makeClient = () => {
    const url = process.env.AI_SERVICE_URL;
    if (!url) throw new Error("AI_SERVICE_URL is not set in .env");
    return axios.create({
        baseURL: url,
        timeout: 60000,
    });
};

// ✅ Start Interview (AI + MongoDB Save)
export const startInterview = async (req, res, next) => {
    try {
        const { name, interview_type, max_questions } = req.body;
        const client = makeClient();

        console.log(`🚀 Controller: Starting AI session for ${name}...`);

        // 1. Get from AI
        const py = await client.post("/start", { name, interview_type, max_questions });
        const { session_id, current_question } = py.data;

        // 2. FORWARD to MongoDB
        try {
            const newInterview = new Interview({
                session_id,
                name,
                interview_type,
                max_questions,
                questions: [{
                    question_number: 1,
                    question_text: current_question,
                    answer: "",
                    feedback: { assessment: "" }
                }]
            });
            await newInterview.save();
            console.log(`✅ MongoDB: Session [${session_id}] successfully initialized.`);
        } catch (dbErr) {
            console.error("❌ MongoDB Start Error:", dbErr.message);
        }

        res.status(200).json(py.data);
    } catch (err) {
        console.error("❌ AI Start Error:", err.message);
        next(err);
    }
};

// ✅ Submit Answer (AI + MongoDB Push)
export const submitAnswer = async (req, res, next) => {
    try {
        const { session_id, latest_answer } = req.body;
        const client = makeClient();

        console.log(`💬 Controller: Processing answer for session: ${session_id}`);

        // 1. Get from AI
        const py = await client.post("/answer", { session_id, latest_answer });
        const { feedback, current_question, question_count, summary } = py.data;

        // 2. FORWARD to MongoDB
        try {
            const updated = await Interview.findOneAndUpdate(
                { session_id },
                {
                    $push: {
                        questions: {
                            question_number: question_count,
                            question_text: current_question,
                            answer: latest_answer,
                            feedback
                        }
                    },
                    $set: { summary }
                },
                { new: true }
            );

            if (updated) {
                console.log(`✅ MongoDB: Successfully pushed data to session [${session_id}].`);
            } else {
                console.warn(`⚠️ MongoDB: Document with session_id [${session_id}] not found.`);
            }
        } catch (dbErr) {
            console.error("❌ MongoDB Update Error:", dbErr.message);
        }

        res.status(200).json(py.data);
    } catch (err) {
        console.error("❌ AI Answer Error:", err.message);
        next(err);
    }
};