import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import SearchDonors from './pages/SearchDonors';
import BloodRequests from './pages/BloodRequests';
import SocialFeed from './pages/SocialFeed';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import AIChatbot from './components/AIChatbot';
import { Shield, Lock } from 'lucide-react';
import './i18n';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AppContent = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/search" element={<SearchDonors />} />
          <Route path="/requests" element={<BloodRequests />} />
          <Route path="/feed" element={<SocialFeed />} />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      <Toaster position="bottom-right" />
      <AIChatbot />
      
      {/* Admin Access Footer */}
      <footer className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Shield className="h-4 w-4" />
            <span>© 2026 BloodTraking. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/admin" className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-red-600 transition-colors">
              <Lock className="h-3 w-3" />
              Admin Access
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
