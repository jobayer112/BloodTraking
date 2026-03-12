import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MapPin, Droplets, Calendar, Phone, AlertCircle, Clock, CheckCircle2, X, Trash2, Search, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn } from '../utils/helpers';
import { BloodRequest } from '../types';
import { notifyMatchingDonors, createNotification } from '../utils/notifications';

import ConfirmationModal from '../components/ConfirmationModal';

const BloodRequests = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightRequestId = searchParams.get('id');
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    if (highlightRequestId && !loading && requests.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(highlightRequestId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-red-600', 'ring-offset-2');
          setTimeout(() => element.classList.remove('ring-2', 'ring-red-600', 'ring-offset-2'), 3000);
        }
      }, 500);
    }
  }, [highlightRequestId, loading, requests]);

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

  const handleDelete = (requestId: string) => {
    setRequestToDelete(requestId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;
    try {
      await deleteDoc(doc(db, 'bloodRequests', requestToDelete));
      toast.success('Request deleted successfully');
      setDeleteModalOpen(false);
      setRequestToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filterOpen ? (r.status as string) === 'open' : true;
    const matchesSearch = 
      r.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bloodGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requesterName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleShare = async (request: BloodRequest) => {
    const shareText = `Emergency Blood Request!\nGroup: ${request.bloodGroup}\nHospital: ${request.hospitalName}\nDistrict: ${request.district}\nDate: ${new Date(request.requiredDate).toLocaleDateString()}\nContact: ${request.contactPhone}\nNote: ${request.note || 'N/A'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blood Request',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Request details copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy');
      }
    }
  };

  const addToCalendar = (request: BloodRequest) => {
    const date = new Date(request.requiredDate).toISOString().replace(/-|:|\.\d+/g, '');
    const title = encodeURIComponent(`Blood Donation: ${request.bloodGroup}`);
    const details = encodeURIComponent(`Hospital: ${request.hospitalName}\nContact: ${request.contactPhone}`);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`;
    window.open(url, '_blank');
  };

  const findMatches = (request: BloodRequest) => {
    navigate(`/donors?group=${encodeURIComponent(request.bloodGroup)}&district=${encodeURIComponent(request.district)}`);
  };

  const availableDistricts = newRequest.division ? DISTRICTS_BY_DIVISION[newRequest.division] : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-[10px] font-bold tracking-widest uppercase border border-red-100 dark:border-red-900/30">
            <AlertCircle className="h-3 w-3" />
            Urgent Needs
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">{t('requests')}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl font-medium">View and respond to urgent blood needs in your community.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search hospital, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              "w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-black transition-all uppercase tracking-widest border",
              filterOpen 
                ? "bg-red-50 border-red-200 text-red-600" 
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
            )}
          >
            {filterOpen ? 'Showing Open Only' : 'Show All Requests'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary w-full sm:w-auto py-3.5"
          >
            <Plus className="h-4 w-4" />
            {t('request_blood')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="h-12 w-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold animate-pulse">Loading requests...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRequests.length > 0 ? filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              id={request.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "card group relative flex flex-col",
                request.emergencyLevel === 'critical' 
                  ? "border-red-200 dark:border-red-900/30 bg-red-50/10 dark:bg-red-900/5" 
                  : request.emergencyLevel === 'urgent'
                    ? "border-amber-200 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-900/5"
                    : ""
              )}
            >
              {request.emergencyLevel === 'critical' && (
                <div className="absolute -top-3 -right-3 h-8 w-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg animate-bounce z-10">
                  <AlertCircle className="h-4 w-4" />
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border",
                    request.emergencyLevel === 'critical' 
                      ? "bg-red-600 text-white border-red-700" 
                      : request.emergencyLevel === 'urgent'
                        ? "bg-amber-500 text-white border-amber-600"
                        : "bg-zinc-100 dark:bg-zinc-800 text-red-600 border-zinc-200 dark:border-zinc-700"
                  )}>
                    {request.bloodGroup}
                  </div>
                  <div className="space-y-1">
                    <Link to={`/user/${request.requesterId}`} className="font-black text-zinc-900 dark:text-white hover:text-red-600 transition-colors leading-tight">
                      {request.requesterName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        request.emergencyLevel === 'critical' 
                          ? "bg-red-100 text-red-700 border-red-200" 
                          : request.emergencyLevel === 'urgent'
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {request.emergencyLevel}
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        (request.status as string) === 'open' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      )}>
                        {request.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hospital</div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">{request.hospitalName}, {request.district}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Required Date</div>
                        <button 
                          onClick={() => addToCalendar(request)}
                          className="text-[10px] text-red-600 font-black hover:underline uppercase tracking-widest"
                        >
                          + Add to Calendar
                        </button>
                      </div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">{new Date(request.requiredDate).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                    </div>
                  </div>
                </div>

                {request.note && (
                  <div className="relative p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 italic text-sm text-zinc-500">
                    <div className="absolute -top-2 left-4 px-2 bg-white dark:bg-zinc-900 text-[8px] font-black text-zinc-400 uppercase tracking-widest">Note</div>
                    "{request.note}"
                  </div>
                )}
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                {(request.status as string) === 'open' ? (
                  <>
                    <a
                      href={`tel:${request.contactPhone}`}
                      className="flex-1 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
                    >
                      <Phone className="h-4 w-4" />
                      Call Now
                    </a>
                    {(profile?.uid === request.requesterId || profile?.role === 'admin') && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFulfill(request.id)}
                          className="p-3.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all border border-emerald-100 dark:border-emerald-900/30"
                          title="Mark as Fulfilled"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        {profile?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(request.id)}
                            className="p-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all border border-red-100 dark:border-red-900/30"
                            title="Delete Request"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Request Fulfilled
                  </div>
                )}
                
                <div className="w-full flex gap-2">
                  <button 
                    onClick={() => handleShare(request)}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share
                  </button>
                  {(request.status as string) === 'open' && (
                    <button 
                      onClick={() => findMatches(request)}
                      className="flex-1 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Find Donors
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-32 space-y-6">
              <div className="h-24 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Droplets className="h-12 w-12 text-zinc-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">No Requests Found</h3>
                <p className="text-zinc-500 font-medium max-w-sm mx-auto">There are no active blood requests at the moment. Check back later or create one if needed.</p>
              </div>
            </div>
          )}
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
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12 space-y-8">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white leading-tight">{t('request_blood')}</h2>
                    <p className="text-sm text-zinc-500 font-medium">Fill in the details to post an urgent blood request.</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="label-text ml-1">{t('blood_group')}</label>
                    <select
                      required
                      value={newRequest.bloodGroup}
                      onChange={(e) => setNewRequest({ ...newRequest, bloodGroup: e.target.value })}
                      className="input-field py-3.5"
                    >
                      <option value="">Select Group</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">Emergency Level</label>
                    <select
                      required
                      value={newRequest.emergencyLevel}
                      onChange={(e) => setNewRequest({ ...newRequest, emergencyLevel: e.target.value })}
                      className="input-field py-3.5"
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">Hospital Name</label>
                    <input
                      required
                      type="text"
                      value={newRequest.hospitalName}
                      onChange={(e) => setNewRequest({ ...newRequest, hospitalName: e.target.value })}
                      className="input-field py-3.5"
                      placeholder="e.g. Dhaka Medical College"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">{t('division')}</label>
                    <select
                      required
                      value={newRequest.division}
                      onChange={(e) => setNewRequest({ ...newRequest, division: e.target.value, district: '' })}
                      className="input-field py-3.5"
                    >
                      <option value="">Select Division</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">{t('district')}</label>
                    <select
                      required
                      value={newRequest.district}
                      onChange={(e) => setNewRequest({ ...newRequest, district: e.target.value })}
                      disabled={!newRequest.division}
                      className="input-field py-3.5"
                    >
                      <option value="">Select District</option>
                      {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">Required Date</label>
                    <input
                      required
                      type="date"
                      value={newRequest.requiredDate}
                      onChange={(e) => setNewRequest({ ...newRequest, requiredDate: e.target.value })}
                      className="input-field py-3.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-text ml-1">Contact Phone</label>
                    <input
                      required
                      type="tel"
                      value={newRequest.contactPhone}
                      onChange={(e) => setNewRequest({ ...newRequest, contactPhone: e.target.value })}
                      className="input-field py-3.5"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="label-text ml-1">Additional Note</label>
                    <textarea
                      value={newRequest.note}
                      onChange={(e) => setNewRequest({ ...newRequest, note: e.target.value })}
                      rows={3}
                      className="input-field py-3.5 resize-none"
                      placeholder="Any specific instructions or details..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary md:col-span-2 py-4 text-sm"
                  >
                    Post Request
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Request"
        message="Are you sure you want to delete this blood request? This action cannot be undone."
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  );
};

export default BloodRequests;
