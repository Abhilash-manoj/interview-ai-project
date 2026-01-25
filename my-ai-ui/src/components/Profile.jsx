// src/components/Profile.jsx
import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.status === 401) {
          localStorage.clear();
          window.location.href = "/login";
          return;
        }

        const data = await res.json();
        setUserData(data.user);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="text-center mt-20 font-bold">Loading Audit Profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userName={userData?.name} />

      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-center gap-4 mb-8 border-b pb-6">
          <div className="h-20 w-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-black">
            {userData?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900">{userData?.name}</h2>
            <p className="text-gray-500 font-medium italic">Verified Candidate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Email</label>
            <p className="text-lg font-bold text-gray-800">{userData?.email}</p>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Created</label>
            <p className="text-lg font-bold text-gray-800">
              {new Date(userData?.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* 📊 Placeholder for Future Score History */}
        <div className="mt-12 p-6 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="font-black text-blue-800 uppercase text-sm mb-2">Audit History</h3>
          <p className="text-sm text-blue-600">
            Your past interview scores and recruiter feedback will be archived here soon.
          </p>
        </div>
      </div>
    </div>
  );
}