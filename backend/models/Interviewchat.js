import mongoose from 'mongoose';

const InterviewSchema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    interview_type: { type: String, required: true },
    max_questions: { type: Number, default: 3 },
    resume_text: { type: String },
    // 📝 Array to store the full conversation history
    questions: [{
        question_number: Number,
        question_text: String,
        answer: String,
        feedback: {
            assessment: String
        }
    }],
    // 📊 Final summary report
    summary: {
        overall_performance: String,
        interview_score: Number,
        resume_score: Number,
        hiring_verdict: String
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Interview', InterviewSchema);