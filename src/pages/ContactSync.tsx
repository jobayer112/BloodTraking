import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Phone, Search, CheckCircle, Shield, ArrowRight, UserPlus, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

const ContactSync = () => {
  const { profile } = useAuth();
  const [matchingDonors, setMatchingDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
      setIsSupported(false);
    }
  }, []);

  const handleSync = async () => {
    if (!isSupported) {
      toast.error('Contact Picker API is not supported in your browser. Try using a mobile browser.');
      return;
    }

    setLoading(true);
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts.length === 0) {
        setLoading(false);
        return;
      }

      // Extract phone numbers and normalize them
      const phoneNumbers = contacts.flatMap((c: any) => 
        c.tel.map((t: string) => t.replace(/\D/g, '').slice(-11))
      );

      // Firebase query (limit 10 per query for 'in' operator, but we'll fetch all and filter in memory for simplicity if list is small, or chunk it)
      // For this demo, we'll fetch all donors and match in memory to avoid complex chunking logic
      const donorsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'donor')));
      const allDonors = donorsSnap.docs.map(doc => doc.data() as UserProfile);
      
      const matches = allDonors.filter(donor => {
        const normalizedDonorPhone = donor.phone.replace(/\D/g, '').slice(-11);
        return phoneNumbers.includes(normalizedDonorPhone);
      });

      setMatchingDonors(matches);
      if (matches.length === 0) {
        toast('No matching donors found in your contacts.', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${matches.length} donors in your contacts!`);
      }
    } catch (error) {
      console.error('Error syncing contacts:', error);
      toast.error('Failed to sync contacts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-20 w-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center mx-auto">
          <Users className="h-10 w-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Contact Sync</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Find which of your friends and family are registered blood donors on our platform.
        </p>
      </div>

      {!loading && matchingDonors.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-xl text-center space-y-8"
        >
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="h-12 w-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="font-bold text-sm">Privacy First</h3>
              <p className="text-xs text-zinc-500">We don't store your contacts. Matching happens securely.</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 w-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="font-bold text-sm">Instant Match</h3>
              <p className="text-xs text-zinc-500">Instantly see who can help in an emergency.</p>
            </div>
            <div className="space-y-3">
              <div className="h-12 w-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                <Phone className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="font-bold text-sm">Direct Contact</h3>
              <p className="text-xs text-zinc-500">Call or message them directly from the app.</p>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-bold text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 mx-auto group"
            >
              <Users className="h-6 w-6" />
              Sync My Contacts
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {!isSupported && (
              <p className="mt-4 text-xs text-amber-600 font-medium">
                Note: Your browser doesn't support the Contact Picker API. Try using Chrome on Android.
              </p>
            )}
          </div>
        </motion.div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-zinc-500 font-medium animate-pulse">Scanning your contacts for donors...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Donors in Your Contacts</h2>
            <button 
              onClick={() => setMatchingDonors([])}
              className="text-sm font-bold text-zinc-500 hover:text-zinc-900"
            >
              Clear Results
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {matchingDonors.map((donor, index) => (
              <motion.div
                key={donor.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {donor.photoURL ? (
                      <img src={donor.photoURL} alt={donor.name} className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-7 w-7 text-zinc-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-white">{donor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-[10px] font-bold">
                        {donor.bloodGroup}
                      </span>
                      <span className="text-xs text-zinc-500">{donor.district}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <a 
                    href={`tel:${donor.phone}`}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <button 
                    onClick={() => navigate('/messages')}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactSync;
