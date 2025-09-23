import React, { useState, useEffect, useRef } from "react";

// ✨ Helper for icons to make the UI more engaging
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AiIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FeedbackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
const SummaryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


export default function InterviewChat() {
  // --- State Management ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [interviewType, setInterviewType] = useState("HR");
  const [maxQuestions, setMaxQuestions] = useState(3); // ✨ NEW: State for interview length
  const [isLoading, setIsLoading] = useState(false);   // ✨ NEW: Loading state for UI feedback
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  
  const chatRef = useRef(null);
  const name = "Abhilash"; // Hardcoded for this example

  // --- Effects ---
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // --- API Functions ---
  const startInterview = async () => {
    setIsLoading(true);
    setMessages([]);
    try {
      const res = await fetch("http://localhost:5000/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🔧 UPDATED: Send max_questions to the backend
        body: JSON.stringify({ name, interview_type: interviewType, max_questions: maxQuestions }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ type: "question", text: data.current_question }]);
      setStarted(true);
    } catch (err) {
      console.error("Error starting interview:", err);
      setMessages([{ type: "error", text: "⚠️ Failed to start interview. Please check the console and try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!input.trim() || isLoading) return;

    const answerText = input.trim();
    setMessages((prev) => [...prev, { type: "user", text: answerText }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, latest_answer: answerText }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      let newMessages = [];

      if (data.feedback) {
        newMessages.push({ type: "feedback", text: data.feedback });
      }

      if (data.summary) {
        newMessages.push({ type: "summary", text: data.summary });
        setFinished(true);
      } else if (data.current_question) {
        newMessages.push({ type: "question", text: data.current_question });
      }
      
      setMessages(prev => [...prev, ...newMessages]);

    } catch (err) {
      console.error("Error sending answer:", err);
      setMessages(prev => [...prev, { type: "error", text: "⚠️ Failed to send answer. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Functions ---
  const renderMessage = (msg, idx) => {
    const messageStyles = {
        user: { container: "justify-end", bubble: "bg-blue-500 text-white", icon: <UserIcon /> },
        question: { container: "justify-start", bubble: "bg-gray-200 text-gray-800", icon: <AiIcon /> },
        feedback: { container: "justify-start", bubble: "bg-yellow-100 border border-yellow-300 text-yellow-800", icon: <FeedbackIcon /> },
        summary: { container: "justify-start", bubble: "bg-green-100 border border-green-300 text-green-800", icon: <SummaryIcon /> },
        error: { container: "justify-start", bubble: "bg-red-100 border border-red-300 text-red-800", icon: <AiIcon /> }
    };

    const { container, bubble, icon } = messageStyles[msg.type] || messageStyles.question;

    return (
        <div key={idx} className={`flex items-end gap-2 ${container}`}>
            {msg.type !== "user" && <div className="flex-shrink-0">{icon}</div>}
            <div className={`p-3 rounded-lg max-w-md whitespace-pre-wrap ${bubble}`}>
                {msg.text}
            </div>
            {msg.type === "user" && <div className="flex-shrink-0">{icon}</div>}
        </div>
    );
  };


  // --- Main Component Return ---
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto h-[90vh] p-4 border rounded-lg shadow-2xl bg-white font-sans">
      {!started ? (
        <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Mock Interview AI</h1>
          <p className="text-gray-600">Select your interview type and let's get started!</p>
          <div className="space-y-4 w-full max-w-xs">
            <select
              className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
            >
              <option value="HR">HR Interview</option>
              <option value="Technical">Technical Interview</option>
              <option value="Behavioral">Behavioral Interview</option>
            </select>
            <div className="flex items-center gap-4">
                <label htmlFor="max-questions" className="text-gray-600">Questions:</label>
                <input
                    id="max-questions"
                    type="number"
                    min="1"
                    max="10"
                    value={maxQuestions}
                    onChange={(e) => setMaxQuestions(Number(e.target.value))}
                    className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
                />
            </div>
          </div>
          <button
            onClick={startInterview}
            disabled={isLoading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      ) : (
        <>
          <div ref={chatRef} className="flex-1 overflow-y-auto mb-4 p-4 space-y-4">
            {messages.map(renderMessage)}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                  <AiIcon />
                  <div className="p-3 rounded-lg bg-gray-200 text-gray-500">
                    <span className="animate-pulse">Typing...</span>
                  </div>
              </div>
            )}
          </div>

          {!finished ? (
            <div className="flex space-x-2 border-t pt-4">
              <input
                className="flex-1 border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                type="text"
                value={input}
                placeholder={isLoading ? "AI is thinking..." : "Type your answer..."}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAnswer()}
                disabled={isLoading}
              />
              <button
                onClick={sendAnswer}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          ) : (
            <div className="text-center border-t pt-4">
                <p className="font-semibold text-green-600">🎉 Interview Complete! 🎉</p>
                <button onClick={() => setStarted(false)} className="mt-4 text-blue-600 hover:underline">Start New Interview</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}