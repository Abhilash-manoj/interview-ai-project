import React, { useState } from "react";

export default function InterviewChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [interviewType, setInterviewType] = useState("HR");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const USER_ID = "Abhilash"; // Optional: if you want user tracking

  // Start Interview
  const startInterview = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: USER_ID, // send name or actual user
          interview_type: interviewType,
        }),
      });

      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([{ role: "ai", text: data.question }]);
      setStarted(true);
    } catch (err) {
      console.error("Error starting interview:", err);
    }
  };

  // Send Answer
  const sendAnswer = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);

    try {
      const res = await fetch("http://localhost:5000/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, answer: input }),
      });

      const data = await res.json();

      if (data.summary) {
        // Interview finished
        setMessages([
          ...newMessages,
          { role: "ai", text: data.feedback },
          { role: "ai", text: `Final Summary: ${data.summary}` },
        ]);
        setFinished(true);
      } else {
        setMessages([
          ...newMessages,
          { role: "ai", text: data.feedback },
          { role: "ai", text: data.question },
        ]);
      }

      setInput("");
    } catch (err) {
      console.error("Error sending answer:", err);
    }
  };

  return (
    <div className="flex flex-col max-w-2xl mx-auto p-4 border rounded-lg shadow-lg bg-white">
      {!started ? (
        <div className="flex flex-col items-center space-y-4">
          <h2 className="text-xl font-bold">Start Mock Interview</h2>
          <select
            className="border p-2 rounded"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
          >
            <option value="HR">HR</option>
            <option value="Technical">Technical</option>
            <option value="Behavioral">Behavioral</option>
          </select>
          <button
            onClick={startInterview}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Start Interview
          </button>
        </div>
      ) : (
        <>
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-96">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-100 text-right"
                    : "bg-gray-100 text-left"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {!finished && (
            <div className="flex space-x-2">
              <input
                className="flex-1 border p-2 rounded"
                type="text"
                value={input}
                placeholder="Type your answer..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAnswer()}
              />
              <button
                onClick={sendAnswer}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Send
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
