import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useParams, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import SearchDonors from './pages/SearchDonors';
import BloodRequests from './pages/BloodRequests';
import SocialFeed from './pages/SocialFeed';
import DonorRegistration from './pages/DonorRegistration';
import ContactDonors from './pages/ContactDonors';
import ContactSync from './pages/ContactSync';
import InviteFriends from './pages/InviteFriends';
import Messages from './pages/Messages';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import UserProfile from './pages/UserProfile';
import AIChatbot from './components/AIChatbot';
import { Shield, Lock } from 'lucide-react';
import './i18n';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const ReferralRedirect = () => {
  const { refId } = useParams();
  return <Navigate to={`/login?ref=${refId}`} replace />;
};

const AppContent = () => {
  const location = useLocation();
  const isMessagesPage = location.pathname === '/messages';

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-300 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/search" element={<SearchDonors />} />
          <Route path="/requests" element={<BloodRequests />} />
          <Route path="/feed" element={<SocialFeed />} />
          <Route path="/contacts" element={<ContactDonors />} />
          <Route path="/sync" element={<ContactSync />} />
          <Route path="/invite" element={<InviteFriends />} />
          <Route path="/user/:uid" element={<UserProfile />} />
          <Route path="/r/:refId" element={<ReferralRedirect />} />
          <Route 
            path="/register-donor" 
            element={
              <ProtectedRoute>
                <DonorRegistration />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } 
          />
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
            element={<AdminDashboard />} 
          />
        </Routes>
      </main>
      <Toaster position="top-right" />
      <AIChatbot />
      
      {!isMessagesPage && (
        <footer className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 bg-red-600 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tighter">BloodTraking</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Connecting blood donors with those in need. Every drop counts, every donor is a hero.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Platform</h4>
                  <ul className="space-y-2 text-sm font-medium">
                    <li><Link to="/search" className="hover:text-red-600 transition-colors">Find Donors</Link></li>
                    <li><Link to="/requests" className="hover:text-red-600 transition-colors">Blood Requests</Link></li>
                    <li><Link to="/feed" className="hover:text-red-600 transition-colors">Community</Link></li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Support</h4>
                  <ul className="space-y-2 text-sm font-medium">
                    <li><Link to="/profile" className="hover:text-red-600 transition-colors">Profile</Link></li>
                    <li><Link to="/invite" className="hover:text-red-600 transition-colors">Invite Friends</Link></li>
                    <li><Link to="/admin" className="hover:text-red-600 transition-colors">Admin</Link></li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Newsletter</h4>
                <div className="flex gap-2">
                  <input type="email" placeholder="Email" className="input-field" />
                  <button className="btn-primary px-4">Join</button>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex flex-col items-center md:items-start gap-1">
                <div className="flex items-center gap-2 text-zinc-500 text-xs">
                  <span>© 2026 BloodTraking. All rights reserved.</span>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Developed By <a href="https://zobaer-portfolio.lovable.app" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">MD ZOBAER HASAN</a>
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-medium">
                  <Lock className="h-3 w-3" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
