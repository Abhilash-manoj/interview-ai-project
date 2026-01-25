import { Routes, Route, Navigate } from "react-router-dom";
import Signin from "./components/Signin";
import Signup from "./components/Signup";
import InterviewChat from "./components/interviewChat"; 
import Profile from "./components/Profile"; 
import Navbar from "./components/Navbar";

function App() {
  // Pull the name for the Navbar if it exists
  const userName = localStorage.getItem("userName"); 

  return (
    <>
      <Routes>
        {/* All routes are now directly accessible */}
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/interviewChat" element={<InterviewChat />} />
        <Route path="/profile" element={<Profile />} />

        {/* Default redirect to signin if path doesn't exist */}
        <Route path="*" element={<Navigate to="/signin" />} />
      </Routes>
    </>
  );
}

export default App;