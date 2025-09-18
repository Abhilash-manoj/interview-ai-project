// src/App.jsx
import { Routes, Route } from "react-router-dom";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import InterviewChat from "./components/interviewChat";
import "./index.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Signin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/interviewChat" element={<InterviewChat />} />
    </Routes>
  );
}

export default App;
