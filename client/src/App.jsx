import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import CRM from './pages/CRM';
import Listings from './pages/Listings';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#F8FAFC]">
        <Navigation />
        <div className="flex-1 flex overflow-hidden">
          <Routes>
            <Route path="/" element={<CRM />} />
            <Route path="/dashboard" element={<div className="p-10 font-black opacity-20 uppercase tracking-widest">Performance Analytics</div>} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/settings" element={<div className="p-10 font-black opacity-20 uppercase tracking-widest">Bot Configuration</div>} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}