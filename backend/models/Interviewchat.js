import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  strengths: [String],
  areas_for_improvement: [String],
}, { _id: false }); // Prevents Mongoose from creating an _id for sub-documents

const questionSchema = new mongoose.Schema({
  question_number: Number,
  question_text: String,
  answer: String,
  feedback: feedbackSchema,
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  session_id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  interview_type: {
    type: String,
    required: true
  },
  max_questions: {
    type: Number,
    required: true
  },
  questions: [questionSchema],
  summary: feedbackSchema,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;