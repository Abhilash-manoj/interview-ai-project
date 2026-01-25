// src/components/Navbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 bg-blue-100 p-1 rounded-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function Navbar({ userName }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-white border-b border-gray-100 px-6 py-3 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/interviewChat")}>
        <span className="text-xl font-black text-blue-600 tracking-tighter">AI.AUDIT</span>
      </div>

      <div className="flex items-center gap-6">
        {/* 👤 User Profile Button */}
        <button 
          onClick={() => navigate("/profile")} // 🚀 Navigates to the profile route
          className="flex items-center gap-3 border-r pr-6 border-gray-200 hover:opacity-70 transition-opacity focus:outline-none group"
        >
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase leading-none group-hover:text-blue-500 transition-colors">Candidate</p>
            <p className="text-sm font-black text-gray-800">{userName || "User"}</p>
          </div>
          <UserIcon />
        </button>

        {/* 🚪 Logout Button */}
        <button 
          onClick={handleLogout}
          className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}