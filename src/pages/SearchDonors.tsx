import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, MapPin, Droplets, Phone, User, CheckCircle, LayoutGrid, Map as MapIcon, X, Share2, Calendar, Weight, Ruler } from 'lucide-react';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn } from '../utils/helpers';
import { UserProfile } from '../types';
import DonorMap from '../components/DonorMap';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const SearchDonors = () => {
  const { t } = useTranslation();
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [filters, setFilters] = useState({
    bloodGroup: '',
    division: '',
    district: '',
  });
  const [selectedDonor, setSelectedDonor] = useState<UserProfile | null>(null);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'users'),
        where('isAvailable', '==', true),
        where('role', '==', 'donor')
      );

      if (filters.bloodGroup) {
        q = query(q, where('bloodGroup', '==', filters.bloodGroup));
      }
      if (filters.division) {
        q = query(q, where('division', '==', filters.division));
      }
      if (filters.district) {
        q = query(q, where('district', '==', filters.district));
      }

      const querySnapshot = await getDocs(q);
      const donorList = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setDonors(donorList);
    } catch (error) {
      console.error("Error fetching donors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [filters]);

  const availableDistricts = filters.division ? DISTRICTS_BY_DIVISION[filters.division] : [];

  const handleShare = async (donor: UserProfile) => {
    const shareText = t('share_text', {
      name: donor.name,
      group: donor.bloodGroup,
      phone: donor.phone,
      location: `${donor.upazila}, ${donor.district}`
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blood Donor Contact',
          text: shareText,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Contact information copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy contact information');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('find_donor')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
          Search for verified blood donors in your area.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('blood_group')}</label>
            <select
              value={filters.bloodGroup}
              onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-sm"
            >
              <option value="">All</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('division')}</label>
            <select
              value={filters.division}
              onChange={(e) => setFilters({ ...filters, division: e.target.value, district: '' })}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-sm"
            >
              <option value="">All</option>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('district')}</label>
            <select
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              disabled={!filters.division}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50 text-sm"
            >
              <option value="">All</option>
              {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button
            onClick={fetchDonors}
            className="py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <SearchIcon className="h-4 w-4" />
            {t('find_donor')}
          </button>
        </div>

        <div className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === 'map' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <MapIcon className="h-3.5 w-3.5" />
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : viewMode === 'map' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <DonorMap donors={donors} onDonorSelect={setSelectedDonor} />
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donors.length > 0 ? donors.map((donor, index) => (
            <motion.div
              key={donor.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedDonor(donor)}
              className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all space-y-4 cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {donor.photoURL ? (
                      <img src={donor.photoURL} alt={donor.name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-zinc-400" />
                    )}
                  </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{donor.name}</h3>
                        {donor.isVerified && (
                          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[7px] font-bold border border-blue-100 dark:border-blue-900/30">
                            <CheckCircle className="h-2 w-2 fill-blue-600/10" />
                            Verified
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {donor.district}
                      </p>
                    </div>
                </div>
                <div className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-bold text-base">
                  {donor.bloodGroup}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Donations</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{donor.donationCount}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase">Last Donation</p>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{donor.lastDonationDate || 'Never'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={`tel:${donor.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {t('call')}
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(donor);
                  }}
                  className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-20 space-y-4">
              <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <SearchIcon className="h-10 w-10 text-zinc-400" />
              </div>
              <p className="text-zinc-500 font-medium">No donors found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
      {/* Donor Details Modal */}
      <AnimatePresence>
        {selectedDonor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDonor(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {selectedDonor.photoURL ? (
                        <img src={selectedDonor.photoURL} alt={selectedDonor.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{selectedDonor.name}</h2>
                        {selectedDonor.isVerified && <CheckCircle className="h-5 w-5 text-blue-500 fill-current" />}
                      </div>
                      <p className="text-zinc-500 font-medium flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {selectedDonor.upazila}, {selectedDonor.district}, {selectedDonor.division}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDonor(null)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6 text-zinc-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 text-center space-y-1">
                    <p className="text-[10px] font-bold text-red-600/60 uppercase tracking-wider">{t('blood_group')}</p>
                    <p className="text-3xl font-black text-red-600">{selectedDonor.bloodGroup}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center space-y-1">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('donation_count')}</p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-white">{selectedDonor.donationCount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t('last_donation')}</span>
                    </div>
                    <span className="font-bold">{selectedDonor.lastDonationDate || 'Never'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                      <Weight className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">{t('weight')}</p>
                        <p className="font-bold">{selectedDonor.weight || 'N/A'} kg</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                      <Ruler className="h-5 w-5 text-zinc-400" />
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">{t('height')}</p>
                        <p className="font-bold">{selectedDonor.height || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <a
                    href={`tel:${selectedDonor.phone}`}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                  >
                    <Phone className="h-5 w-5" />
                    {t('call')}
                  </a>
                  <button
                    onClick={() => handleShare(selectedDonor)}
                    className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    <Share2 className="h-5 w-5" />
                    {t('share_contact')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchDonors;
