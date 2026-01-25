import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "./Navbar";

// --- Icons ---
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;

export default function UserProfile() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null); // 🚩 Added to track the active report
  const userName = localStorage.getItem("userName") || "Candidate";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/interview/user-history?name=${userName}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userName]);

  // --- 🎨 Helper to render the ChatGPT-style transcript ---
  const renderTranscript = (report) => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <button 
          onClick={() => setSelectedReport(null)} 
          className="flex items-center gap-2 text-gray-500 hover:text-black font-bold transition-colors mb-6"
        >
          <BackIcon /> BACK TO DOSSIERS
        </button>

        <div className="bg-white border rounded-[2rem] p-8 shadow-sm">
          <h3 className="text-3xl font-black mb-6 uppercase tracking-tight">Transcript & Audit</h3>
          
          <div className="space-y-6">
            {report.questions.map((q, idx) => (
              <div key={idx} className="space-y-4">
                {/* AI Question */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 prose prose-sm max-w-none">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Interviewer</span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.question_text}</ReactMarkdown>
                </div>

                {/* User Answer */}
                <div className="bg-blue-600 text-white p-4 rounded-2xl ml-12 shadow-sm prose prose-sm prose-invert max-w-none">
                  <span className="text-[10px] font-bold text-blue-200 uppercase">Your Answer</span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer || "*No answer provided*"}</ReactMarkdown>
                </div>

                {/* Feedback per question */}
                {q.feedback && q.feedback.assessment && (
                  <div className="border-l-4 border-amber-400 pl-4 py-2 italic text-gray-600 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.feedback.assessment}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final Summary Section */}
          {report.summary && (
            <div className="mt-12 pt-8 border-t-2 border-dashed border-gray-200">
              <div className="p-8 bg-gray-900 text-white rounded-3xl space-y-4">
                <p className="font-black text-2xl uppercase tracking-widest text-emerald-400">Executive Summary</p>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.summary.overall_performance}</ReactMarkdown>
                </div>
                <div className="pt-4 flex justify-between items-center border-t border-gray-700">
                  <span className="font-bold text-gray-400 uppercase tracking-widest text-xs">Final Verdict</span>
                  <span className={`text-3xl font-black ${report.summary.hiring_verdict === 'REJECTED' ? 'text-red-500' : 'text-emerald-400'}`}>
                    {report.summary.hiring_verdict}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-8 min-h-screen bg-[#fafafa]">
      <Navbar userName={userName} />
      
      {!selectedReport ? (
        <>
          <h2 className="text-4xl font-black uppercase my-12 tracking-tighter border-b-4 border-black inline-block">Audit Dossiers</h2>
          
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-3xl"></div>)}
            </div>
          ) : (
            <div className="grid gap-6">
              {history.length > 0 ? history.map((session) => (
                <div 
                  key={session.session_id} 
                  onClick={() => setSelectedReport(session)} // 🚩 Trigger detail view
                  className="p-8 bg-white border border-gray-100 rounded-[2rem] shadow-sm flex justify-between items-center group hover:border-black transition-all cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{session.interview_type} Protocol</span>
                    <h3 className="text-2xl font-black text-gray-800">Session Date: {new Date(session.createdAt).toLocaleDateString()}</h3>
                    <p className="text-xs text-gray-400 font-mono">ID: {session.session_id.substring(0, 8)}...</p>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    {session.summary && (
                      <div className="text-right border-r pr-8">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Audit Score</p>
                        <p className="text-4xl font-black text-emerald-600">{session.summary.interview_score}/5</p>
                      </div>
                    )}
                    <button className="bg-gray-50 p-4 rounded-2xl group-hover:bg-black group-hover:text-white transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed text-gray-400 italic">
                  No dossiers found for this candidate.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        renderTranscript(selectedReport) // 🚩 Render the transcript view if a report is selected
      )}
    </div>
  );
}