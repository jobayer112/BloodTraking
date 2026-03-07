import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Mail, 
  Twitter, 
  Facebook,
  Gift,
  Users,
  Heart,
  QrCode
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const InviteFriends = () => {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);

  // In a real app, this would be a unique referral link
  const inviteLink = `${window.location.origin}/login?ref=${profile?.uid || 'guest'}`;
  const inviteMessage = `Join me on BloodTraking! Help save lives by becoming a blood donor or finding donors quickly in emergencies. Register here: ${inviteLink}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    toast.success('Invite message copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    const url = `mailto:?subject=Join BloodTraking&body=${encodeURIComponent(inviteMessage)}`;
    window.location.href = url;
  };

  const shareViaTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(inviteMessage)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-20 w-20 bg-red-50 dark:bg-red-900/20 rounded-[2rem] flex items-center justify-center mx-auto">
          <Gift className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Invite Friends</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Help us grow the community. The more donors we have, the more lives we can save together.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Share Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-xl space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Your Invite Link</h2>
            <div className="relative group">
              <div className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm font-mono break-all pr-12">
                {inviteLink}
              </div>
              <button 
                onClick={copyToClipboard}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-700 rounded-xl shadow-sm hover:shadow-md transition-all text-zinc-600 dark:text-zinc-300"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Share via</h3>
            <div className="grid grid-cols-4 gap-4">
              <button 
                onClick={shareViaWhatsApp}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-14 w-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">WhatsApp</span>
              </button>
              <button 
                onClick={shareViaEmail}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">Email</span>
              </button>
              <button 
                onClick={shareViaTwitter}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-14 w-14 bg-sky-50 dark:bg-sky-900/20 rounded-2xl flex items-center justify-center group-hover:bg-sky-100 dark:group-hover:bg-sky-900/40 transition-colors">
                  <Twitter className="h-6 w-6 text-sky-600" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">Twitter</span>
              </button>
              <button 
                onClick={() => toast.error('Facebook sharing coming soon!')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <Facebook className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500">Facebook</span>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Join BloodTraking',
                    text: inviteMessage,
                    url: inviteLink,
                  }).catch(console.error);
                } else {
                  copyToClipboard();
                }
              }}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all"
            >
              <Share2 className="h-5 w-5" />
              Share Invite Now
            </button>
          </div>
        </motion.div>

        {/* Right: Info Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          {profile && (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold">Your Impact</h3>
                <p className="text-xs text-zinc-500">You've invited {profile.inviteCount || 0} friends</p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          )}

          <div className="bg-zinc-900 text-white p-8 rounded-[3rem] space-y-6">
            <h2 className="text-2xl font-bold">Why Invite?</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-bold">Save More Lives</h4>
                  <p className="text-sm text-zinc-400">Every new donor can save up to 3 lives with a single donation.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold">Stronger Network</h4>
                  <p className="text-sm text-zinc-400">Find donors faster when your own circle is on the platform.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold">Earn Badges</h4>
                  <p className="text-sm text-zinc-400">Get the "Community Builder" badge for successful invites.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 flex items-center gap-6">
            <div className="h-24 w-24 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
              <QrCode className="h-12 w-12 text-zinc-300" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-bold">Personal QR Code</h3>
              <p className="text-xs text-zinc-500">Let friends scan your phone to join instantly.</p>
              <button className="text-xs font-bold text-red-600 hover:underline pt-2">Generate QR Code</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InviteFriends;
