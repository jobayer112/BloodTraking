import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Search as SearchIcon, MapPin, Droplets, Phone, User, CheckCircle, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn } from '../utils/helpers';
import { UserProfile } from '../types';
import DonorMap from '../components/DonorMap';
import { useTranslation } from 'react-i18next';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('find_donor')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
          Search for verified blood donors in your area. Connect instantly and save lives.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-6">
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('blood_group')}</label>
            <select
              value={filters.bloodGroup}
              onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">All Groups</option>
              {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('division')}</label>
            <select
              value={filters.division}
              onChange={(e) => setFilters({ ...filters, division: e.target.value, district: '' })}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="">All Divisions</option>
              {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('district')}</label>
            <select
              value={filters.district}
              onChange={(e) => setFilters({ ...filters, district: e.target.value })}
              disabled={!filters.division}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
            >
              <option value="">All Districts</option>
              {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button
            onClick={fetchDonors}
            className="py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
          >
            <SearchIcon className="h-5 w-5" />
            {t('find_donor')}
          </button>
        </div>

        <div className="flex justify-center border-t border-zinc-100 dark:border-zinc-800 pt-6">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'grid' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                viewMode === 'map' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <MapIcon className="h-4 w-4" />
              Map View
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
          <DonorMap donors={donors} />
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donors.length > 0 ? donors.map((donor, index) => (
            <motion.div
              key={donor.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    {donor.photoURL ? (
                      <img src={donor.photoURL} alt={donor.name} className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-zinc-400" />
                    )}
                  </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-zinc-900 dark:text-white">{donor.name}</h3>
                        {donor.isVerified && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[8px] font-bold border border-blue-100 dark:border-blue-900/30">
                            <CheckCircle className="h-2 w-2 fill-blue-600/10" />
                            Verified
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {donor.district}
                      </p>
                    </div>
                </div>
                <div className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg font-bold text-lg">
                  {donor.bloodGroup}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Donations</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{donor.donationCount}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Last Donation</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{donor.lastDonationDate || 'Never'}</p>
                </div>
              </div>

              <a
                href={`tel:${donor.phone}`}
                className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <Phone className="h-4 w-4" />
                Call Donor
              </a>
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
    </div>
  );
};

export default SearchDonors;
