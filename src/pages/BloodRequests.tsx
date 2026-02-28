import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MapPin, Droplets, Calendar, Phone, AlertCircle, Clock, CheckCircle2, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn } from '../utils/helpers';
import { BloodRequest } from '../types';
import { notifyMatchingDonors, createNotification } from '../utils/notifications';

const BloodRequests = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    bloodGroup: '',
    emergencyLevel: 'normal',
    hospitalName: '',
    division: '',
    district: '',
    requiredDate: '',
    contactPhone: '',
    note: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'bloodRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const requestList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloodRequest));
      setRequests(requestList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('Please login to create a request');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'bloodRequests'), {
        ...newRequest,
        requesterId: profile.uid,
        requesterName: profile.name,
        status: 'open',
        createdAt: new Date().toISOString()
      });

      // Notify matching donors
      await notifyMatchingDonors(newRequest.bloodGroup, newRequest.district, docRef.id);

      toast.success('Blood request created successfully!');
      setShowModal(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleFulfill = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'bloodRequests', requestId), {
        status: 'fulfilled'
      });
      toast.success('Request marked as fulfilled!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await deleteDoc(doc(db, 'bloodRequests', requestId));
      toast.success('Request deleted successfully');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const availableDistricts = newRequest.division ? DISTRICTS_BY_DIVISION[newRequest.division] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('requests')}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">View and respond to urgent blood needs in your community.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 text-sm"
        >
          <Plus className="h-4 w-4" />
          {t('request_blood')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "bg-white dark:bg-zinc-900 p-6 rounded-3xl border shadow-sm space-y-4",
                request.emergencyLevel === 'critical' ? "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5" : "border-zinc-100 dark:border-zinc-800"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg",
                    request.emergencyLevel === 'critical' ? "bg-red-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-red-600"
                  )}>
                    {request.bloodGroup}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{request.requesterName}</h3>
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      {request.emergencyLevel === 'critical' ? (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Critical
                        </span>
                      ) : request.emergencyLevel === 'urgent' ? (
                        <span className="text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Urgent
                        </span>
                      ) : (
                        <span className="text-zinc-500">Normal</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  request.status === 'open' ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                )}>
                  {request.status}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{request.hospitalName}, {request.district}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Needed by: {new Date(request.requiredDate).toLocaleDateString()}</span>
                </div>
              </div>

              {request.note && (
                <p className="text-sm text-zinc-500 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl italic">
                  "{request.note}"
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {request.status === 'open' ? (
                  <>
                    <a
                      href={`tel:${request.contactPhone}`}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs text-center hover:bg-red-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call Now
                    </a>
                    {(profile?.uid === request.requesterId || profile?.role === 'admin') && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleFulfill(request.id)}
                          className="px-3 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-all font-bold text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Fulfill
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="px-3 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all font-bold text-xs flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Request Fulfilled
                  </div>
                )}
                <button className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-xs">
                  Share
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Request Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('request_blood')}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">{t('blood_group')}</label>
                    <select
                      required
                      value={newRequest.bloodGroup}
                      onChange={(e) => setNewRequest({ ...newRequest, bloodGroup: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="">Select Group</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Emergency Level</label>
                    <select
                      required
                      value={newRequest.emergencyLevel}
                      onChange={(e) => setNewRequest({ ...newRequest, emergencyLevel: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Hospital Name</label>
                    <input
                      required
                      type="text"
                      value={newRequest.hospitalName}
                      onChange={(e) => setNewRequest({ ...newRequest, hospitalName: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">{t('division')}</label>
                    <select
                      required
                      value={newRequest.division}
                      onChange={(e) => setNewRequest({ ...newRequest, division: e.target.value, district: '' })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="">Select Division</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">{t('district')}</label>
                    <select
                      required
                      value={newRequest.district}
                      onChange={(e) => setNewRequest({ ...newRequest, district: e.target.value })}
                      disabled={!newRequest.division}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Required Date</label>
                    <input
                      required
                      type="date"
                      value={newRequest.requiredDate}
                      onChange={(e) => setNewRequest({ ...newRequest, requiredDate: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Contact Phone</label>
                    <input
                      required
                      type="tel"
                      value={newRequest.contactPhone}
                      onChange={(e) => setNewRequest({ ...newRequest, contactPhone: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Additional Note</label>
                    <textarea
                      value={newRequest.note}
                      onChange={(e) => setNewRequest({ ...newRequest, note: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="md:col-span-2 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Post Request
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BloodRequests;
