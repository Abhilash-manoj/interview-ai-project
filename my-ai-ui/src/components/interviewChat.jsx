import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

  // --- Security: Session Check ---
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("token");
      const savedName = localStorage.getItem("userName");

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    window.location.href = "/signin";
  };

  // --- API Functions ---
  const processAIResponse = (data) => {
    let newMessages = [];
    if (data.feedback) newMessages.push({ type: "feedback", data: data.feedback });
    if (data.summary) {
      newMessages.push({ type: "summary", data: data.summary });
      setFinished(true);
    } else if (data.current_question) {
      newMessages.push({ type: "question", text: data.current_question });
    }
    setMessages(prev => [...prev, ...newMessages]);
  };

  const startInterview = async () => {
    setIsLoading(true);
    setMessages([]);
    const token = localStorage.getItem("token");
    
    try {
      const formData = new FormData();
      formData.append("name", userName); 
      formData.append("interview_type", interviewType);
      formData.append("max_questions", maxQuestions);
      if (resumeFile) formData.append("resume", resumeFile);

      const res = await fetch("http://localhost:5000/api/interview/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) return handleLogout();
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ type: "question", text: data.current_question }]);
      setStarted(true);
    } catch (err) {
      console.error("Start error", err);
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

      if (res.status === 401) return handleLogout();
      const data = await res.json();
      processAIResponse(data);
    } catch (err) {
      console.error("Answer error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---
  const renderMessage = (msg, idx) => {
    const messageStyles = {
        user: { container: "justify-end", bubble: "bg-blue-600 text-white", icon: <UserIcon /> },
        question: { container: "justify-start", bubble: "bg-gray-100 text-gray-800", icon: <AiIcon /> },
        feedback: { container: "justify-start", bubble: "bg-white border border-gray-200 text-gray-800 w-full", icon: <FeedbackIcon /> },
        summary: { container: "justify-start", bubble: "bg-white border border-gray-200 text-gray-900 w-full", icon: <SummaryIcon /> }
    };

    const { container, bubble, icon } = messageStyles[msg.type] || messageStyles.question;

    const renderContent = () => {
        if (msg.type === "feedback" || msg.type === "summary") {
            const isSummary = msg.type === "summary";
            const d = msg.data;
            const getScoreColor = (s) => s <= 1 ? "bg-red-600 text-white" : s <= 3 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white";

            return (
                <div className="p-6 space-y-4 border-l-8 border-gray-900 rounded-r-xl shadow-md">
                    <p className="font-black uppercase tracking-widest text-xl text-gray-900 border-b pb-2">
                        {isSummary ? "🏆 Final Audit Report" : "🧐 Interviewer Evaluation"}
                    </p>
                    
                    {isSummary && (
                        <div className="flex gap-4">
                            <div className={`px-4 py-2 rounded-lg shadow-sm font-black ${getScoreColor(d.interview_score)}`}>INTERVIEW: {d.interview_score}/5</div>
                            <div className={`px-4 py-2 rounded-lg shadow-sm font-black ${getScoreColor(d.resume_score)}`}>RESUME: {d.resume_score}/5</div>
                        </div>
                    )}

                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        <span className="font-bold uppercase block text-[10px] text-gray-400 mb-2">
                            {isSummary ? "Executive Summary" : "Response Critique"}
                        </span> 
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {isSummary ? d.overall_performance : d.assessment}
                        </ReactMarkdown>
                        
                        {isSummary && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <span className="font-bold uppercase block text-emerald-700 text-[10px] mb-2">Interview Coaching</span>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.interview_coaching}</ReactMarkdown>
                                    </div>
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                        <span className="font-bold uppercase block text-red-700 text-[10px] mb-2">Resume Audit</span>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.resume_coaching}</ReactMarkdown>
                                    </div>
                                </div>
                                <div className="text-center pt-8 border-t mt-6">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Hiring Verdict</span>
                                    <p className={`text-4xl font-black italic uppercase ${d.hiring_verdict === 'REJECTED' ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {d.hiring_verdict}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className={`p-4 prose prose-sm max-w-none ${msg.type === "user" ? "prose-invert" : ""}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div key={idx} className={`flex items-start gap-3 mb-6 ${container}`}>
            {msg.type !== "user" && <div className="mt-2">{icon}</div>}
            <div className={`rounded-2xl max-w-[85%] shadow-sm ${bubble}`}>{renderContent()}</div>
            {msg.type === "user" && <div className="mt-2">{icon}</div>}
        </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto h-[92vh] my-4 border rounded-3xl shadow-2xl bg-white overflow-hidden border-gray-100">
      <Navbar userName={userName} />
      {!started ? (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-10 bg-gradient-to-b from-blue-50 to-white">
          <div className="text-center space-y-3">
            <h1 className="text-5xl font-black text-gray-900 tracking-tight">AI Interviewer</h1>
            <p className="text-gray-500 text-lg">Experience a high-fidelity professional audit.</p>
          </div>
          <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Interview Protocol</label>
              <select className="w-full border-2 p-3 rounded-xl outline-none focus:border-blue-500 transition-all" value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                <option value="HR">HR / Culture Fit</option>
                <option value="Technical">Technical / Coding</option>
                <option value="Behavioral">Behavioral (STAR Method)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session Length</label>
              <input type="number" min="1" max="10" className="w-full border-2 p-3 rounded-xl outline-none focus:border-blue-500" value={maxQuestions} onChange={(e) => setMaxQuestions(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resume Dossier (PDF)</label>
              <div className="relative group border-2 border-dashed p-4 rounded-xl text-center cursor-pointer hover:bg-gray-50 transition-all">
                <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-sm text-gray-600 font-medium truncate block">{resumeFile ? resumeFile.name : "Upload context for AI..."}</span>
              </div>
            </div>
            <button onClick={startInterview} disabled={isLoading} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-lg active:scale-95">
              {isLoading ? "PROVISIONING..." : "BEGIN AUDIT"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-black text-sm text-gray-800 uppercase tracking-widest">{`Session: ${userName}`}</span>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full uppercase">{interviewType}</span>
          </div>
          
          <div ref={chatRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-2 scroll-smooth bg-[#fafafa]">
            {messages.map(renderMessage)}
            {isLoading && (
                <div className="flex gap-2 items-center text-gray-400 font-bold uppercase text-[10px] tracking-widest ml-12">
                   <div className="flex gap-1">
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
                    </div>
                    Auditing Response
                </div>
            )}
          </div>

          <div className="p-6 border-t bg-white">
            {!finished ? (
              <div className="flex gap-4 max-w-4xl mx-auto">
                <input 
                  className="flex-1 border-2 border-gray-100 p-4 rounded-2xl focus:border-blue-500 outline-none transition-all shadow-sm text-gray-800" 
                  type="text" 
                  value={input} 
                  placeholder="Type your answer..." 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && sendAnswer()} 
                  disabled={isLoading} 
                />
                <button onClick={sendAnswer} disabled={isLoading || !input.trim()} className="bg-gray-900 text-white px-10 rounded-2xl font-bold hover:bg-black shadow-lg transition-all active:scale-95">Send</button>
              </div>
            ) : (
              <div className="py-6 text-center space-y-4">
                <p className="text-2xl font-black text-emerald-600 italic tracking-tight">"Audit finalized. Report generated."</p>
                <button onClick={() => window.location.reload()} className="text-gray-900 font-bold border-b-2 border-gray-900 hover:text-gray-600 hover:border-gray-400 transition-all">Start New Audit</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}