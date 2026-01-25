import React, { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";

// --- Icons ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FeedbackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const SummaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;

export default function InterviewChat() {
  // --- State Management ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [interviewType, setInterviewType] = useState("HR");
  const [maxQuestions, setMaxQuestions] = useState(3);
  const [resumeFile, setResumeFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [userName, setUserName] = useState("Candidate"); 

  const chatRef = useRef(null);

  // --- 🔒 Security: Check Token and Name on Load/Refresh ---
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("token");
      const savedName = localStorage.getItem("userName");

      // ✅ Robust check for missing or "null" string tokens to prevent 'malformed' error
      if (!token || token === "null" || token === "undefined") {
        window.location.href = "/signin";
        return;
      }

      if (savedName) setUserName(savedName);

      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        // ✅ Safely handle null user data to prevent 'reading name of null' error
        if (!res.ok || !data?.user?.name) {
          handleLogout();
        } else {
          setUserName(data.user.name);
          localStorage.setItem("userName", data.user.name);
        }
      } catch (err) {
        console.error("Session check failed", err);
      }
    };

    validateSession();
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // --- 🚪 Logout Function ---
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    window.location.href = "/signin";
  };

  // --- API Functions ---
  const startInterview = async () => {
    setIsLoading(true);
    setMessages([]);
    const token = localStorage.getItem("token");
    
    try {
      const formData = new FormData();
      formData.append("name", userName); 
      formData.append("interview_type", interviewType);
      formData.append("max_questions", maxQuestions);
      
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const res = await fetch("http://localhost:5000/api/interview/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ type: "question", text: data.current_question }]);
      setStarted(true);
    } catch (err) {
      console.error("Error starting interview:", err);
      setMessages([{ type: "error", text: "⚠️ Failed to start session." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || isLoading) return;

    const answerText = input.trim();
    const token = localStorage.getItem("token");
    setMessages((prev) => [...prev, { type: "user", text: answerText }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/interview/answer", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ session_id: sessionId, latest_answer: answerText }),
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      let newMessages = [];

      if (data.feedback) newMessages.push({ type: "feedback", data: data.feedback });

      if (data.summary) {
        newMessages.push({ type: "summary", data: data.summary });
        setFinished(true);
      } else if (data.current_question) {
        newMessages.push({ type: "question", text: data.current_question });
      }
      
      setMessages(prev => [...prev, ...newMessages]);
    } catch (err) {
      console.error("Error sending answer:", err);
      setMessages(prev => [...prev, { type: "error", text: "⚠️ Failed to send answer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---
  const renderMessage = (msg, idx) => {
    const messageStyles = {
        user: { container: "justify-end", bubble: "bg-blue-600 text-white", icon: <UserIcon /> },
        question: { container: "justify-start", bubble: "bg-gray-100 text-gray-800", icon: <AiIcon /> },
        feedback: { container: "justify-start", bubble: "bg-amber-50 border border-amber-200 text-amber-900", icon: <FeedbackIcon /> },
        summary: { container: "justify-start", bubble: "bg-emerald-50 border border-emerald-200 text-emerald-900 w-full", icon: <SummaryIcon /> },
        error: { container: "justify-start", bubble: "bg-red-50 text-red-700", icon: <AiIcon /> }
    };

    const { container, bubble, icon } = messageStyles[msg.type] || messageStyles.question;

    const renderContent = () => {
        if (msg.type === "feedback" || msg.type === "summary") {
            const isSummary = msg.type === "summary";
            const d = msg.data;
            
            const getScoreColor = (score) => {
                if (score <= 1) return "bg-red-600 text-white";
                if (score <= 3) return "bg-amber-500 text-white";
                return "bg-emerald-600 text-white";
            };

            return (
                <div className="p-4 space-y-4 border-l-4 border-gray-800 bg-gray-50 shadow-inner">
                    <p className="font-black uppercase tracking-tighter text-xl text-gray-900">
                        {isSummary ? "Final Audit Report" : "Interviewer Evaluation"}
                    </p>

                    {isSummary && (
                        <div className="flex gap-4">
                            <div className={`px-4 py-2 rounded shadow-md font-black ${getScoreColor(d.interview_score)}`}>
                                FINAL INTV: {d.interview_score}/5
                            </div>
                            <div className={`px-4 py-2 rounded shadow-md font-black ${getScoreColor(d.resume_score)}`}>
                                RESUME: {d.resume_score}/5
                            </div>
                        </div>
                    )}

                    <div className="text-sm leading-relaxed space-y-4 text-gray-800">
                        <p>
                            <span className="font-bold uppercase block text-[10px] text-gray-500 mb-1">
                                {isSummary ? "Executive Summary" : "Response Critique"}
                            </span> 
                            {isSummary ? d.overall_performance : d.assessment}
                        </p>
                        
                        {isSummary && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3 bg-white border border-gray-200 rounded text-xs">
                                        <span className="font-bold uppercase block text-emerald-700 mb-1">Interview Coaching</span>
                                        {d.interview_coaching}
                                    </div>
                                    <div className="p-3 bg-white border border-gray-200 rounded text-xs">
                                        <span className="font-bold uppercase block text-red-700 mb-1">Resume Audit</span>
                                        {d.resume_coaching}
                                    </div>
                                </div>
                                <p className="text-center font-black text-3xl uppercase border-t border-gray-200 pt-4 mt-4">
                                    Verdict: <span className={d.hiring_verdict === 'REJECTED' ? 'text-red-600' : 'text-emerald-600'}>{d.hiring_verdict}</span>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            );
        }
        return <p className="p-3 whitespace-pre-wrap">{msg.text}</p>;
    };

    return (
        <div key={idx} className={`flex items-end gap-2 mb-4 ${container}`}>
            {msg.type !== "user" && <div className="mb-1">{icon}</div>}
            <div className={`rounded-2xl max-w-[80%] shadow-sm ${bubble}`}>{renderContent()}</div>
            {msg.type === "user" && <div className="mb-1">{icon}</div>}
        </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto h-[90vh] my-4 border rounded-2xl shadow-xl bg-white overflow-hidden border-gray-100">
      <Navbar userName={userName} />
      {!started ? (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-8 bg-gradient-to-b from-blue-50 to-white">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-extrabold text-gray-900">AI Interviewer</h1>
            <p className="text-gray-500">Practice your skills with a professional audit.</p>
          </div>

          <div className="w-full max-w-sm space-y-5 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Interview Type</label>
              <select className="w-full border-2 p-3 rounded-lg focus:border-blue-500 outline-none transition-all" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                <option value="HR">HR / Culture Fit</option>
                <option value="Technical">Technical / Coding</option>
                <option value="Behavioral">Behavioral (STAR Method)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Number of Questions</label>
              <input type="number" min="1" max="10" className="w-full border-2 p-3 rounded-lg outline-none focus:border-blue-500 transition-all" value={maxQuestions} onChange={(e) => setMaxQuestions(Number(e.target.value))} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Upload Resume (PDF)</label>
              <div className="relative group">
                <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className={`flex items-center gap-3 border-2 border-dashed p-3 rounded-lg transition-all ${resumeFile ? 'border-blue-500 bg-blue-50' : 'border-gray-200 group-hover:border-blue-300'}`}>
                  <FileIcon />
                  <span className="text-sm text-gray-600 truncate">{resumeFile ? resumeFile.name : "Select file (optional)"}</span>
                </div>
              </div>
            </div>

            <button onClick={startInterview} disabled={isLoading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:bg-blue-300 transition-all">
              {isLoading ? "Analyzing..." : "Begin Session"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-bold text-gray-700">Audit for: {userName}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-md uppercase">{interviewType}</span>
              <button 
                onClick={handleLogout}
                className="text-xs font-bold text-red-500 hover:text-red-700 uppercase tracking-wider transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex gap-2 items-center text-gray-400 italic text-sm ml-8">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
                Recruiter is auditing...
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white">
            {!finished ? (
              <div className="flex gap-3">
                <input className="flex-1 border-2 border-gray-100 p-3 rounded-xl focus:border-blue-500 outline-none transition-all shadow-inner" type="text" value={input} placeholder="Type your answer here..." onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendAnswer()} disabled={isLoading} />
                <button onClick={sendAnswer} disabled={isLoading} className="bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 active:scale-95 disabled:bg-blue-300 transition-all">Send</button>
              </div>
            ) : (
              <div className="py-4 text-center space-y-3">
                <p className="text-xl font-bold text-emerald-600 italic">"Audit finalized. Review your report above."</p>
                <button onClick={() => window.location.reload()} className="text-blue-600 font-bold hover:underline underline-offset-4">Restart Session</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}