# 🛡️ Audit.AI  
### The High-Fidelity Interview Auditor  
**Autonomous Professional Evaluation powered by Gemini & LangGraph**

Audit.AI is a next-generation interview simulation platform designed to provide candidates with a rigorous, objective **audit** of their technical and behavioral readiness.  
Unlike traditional AI chatbots, Audit.AI uses a **custom LangGraph state machine** to orchestrate a multi-turn, context-aware interview that adapts in real time to a candidate’s resume and responses.

---

## 🚀 Key Highlights

- 🔁 **Stateful AI Interviews** powered by LangGraph
- 📄 **Resume-Aware Questioning** via PDF parsing
- 🧠 **Gemini-Native Architecture** optimized for low latency
- 📊 **Structured Interview Audits** with scoring & verdicts
- 🛡️ **Production-ready** even on free-tier infrastructure

---

## 🏗️ System Architecture & Data Flow

Audit.AI follows a **distributed monorepo architecture**, ensuring a clean separation of concerns between UI, API, and AI logic.

### 1️⃣ Frontend — *Vercel*
**Stack:** React 18, Vite, Tailwind CSS, Framer Motion  

**Role:**
- High-fidelity chat interface
- Real-time Markdown rendering for AI feedback
- Secure PDF resume upload

**Key Feature:**  
Dynamic session initialization with smooth, animated UX.

---

### 2️⃣ API Gateway — *Render*
**Stack:** Node.js, Express, Mongoose  

**Role:**
- JWT authentication
- Session lifecycle management
- Secure internal service communication

**Key Feature:**  
Persists **turn-by-turn interview logs** to MongoDB Atlas for historical auditing and recovery.

---

### 3️⃣ AI Orchestration Engine — *Render*
**Stack:** Python 3.13, FastAPI, LangGraph, LangChain  

**Role:**  
The **brain** of the system — responsible for interview logic and flow control.

**Key Feature:**  
LangGraph-based state management guarantees interview continuity even across disconnects or page refreshes.

---

## 🧠 Advanced Google AI Integration

Audit.AI is a **Gemini-Native application**, leveraging Google’s latest Generative AI capabilities.

### 🤖 Gemini Flash (Primary Inference Engine)
- Optimized for **low latency**
- Designed for **multi-turn conversational reasoning**
- Ideal for real-time interview simulations

### 📄 Resume Context Injection
- Uploaded PDF resumes are parsed and embedded
- Every question adapts to the candidate’s:
  - Work history
  - Tech stack
  - Experience level

### 📊 Automated Audit Dossier
At interview completion, the system transitions to a **Summary Node** that generates a structured evaluation:

- **Numerical Scores** (1–5)
  - Technical Depth
  - Behavioral Alignment
- **Hiring Verdict**
  - Hire / Reject
- **Interviewer-Style Feedback**
  - Strengths
  - Weaknesses
  - Actionable improvement advice

---

## 🛠️ Technical Resilience & DevOps

Built to survive real-world constraints — even on free tiers.

- 🔄 **Keep-Alive Architecture**  
  Custom `/health` endpoints + Cron pingers prevent Render cold starts.

- 💾 **State Persistence**  
  Every interview turn is checkpointed in MongoDB Atlas.

- 🔐 **Security First**
  - Strict CORS whitelisting
  - Internal API keys between services
  - Environment-based secret management

---

## 📁 Repository Structure

```text
interview-ai-project/
│
├── backend/        # Node.js API Gateway
├── python-ai/      # FastAPI + LangGraph AI engine
├── my-ai-ui/       # React frontend
├── .gitignore
└── README.md
