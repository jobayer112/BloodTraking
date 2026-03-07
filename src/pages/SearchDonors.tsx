import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  doc,
  updateDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, MapPin, Droplets, Phone, User, CheckCircle, LayoutGrid, Map as MapIcon, X, Share2, Calendar, Weight, Ruler, UserPlus, MessageSquare, Navigation, Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn, canDonate, getBadge, calculateDistance } from '../utils/helpers';
import { UserProfile } from '../types';
import DonorMap from '../components/DonorMap';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SearchDonors = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [donors, setDonors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    bloodGroup: searchParams.get('group') || '',
    division: '',
    district: searchParams.get('district') || '',
    availability: 'all', // 'all', 'available', 'unavailable'
    donationStatus: 'all', // 'all', 'ready' (4+ months since last donation)
    phoneSearch: searchParams.get('phone') || '',
    nameSearch: '',
    radius: 0, // 0 means no radius filter
    sortByProximity: false,
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { profile } = useAuth();

  const fetchDonors = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'users'),
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
      let donorList = querySnapshot.docs.map(doc => doc.data() as UserProfile);

      // In-memory filtering for more complex criteria
      if (filters.phoneSearch) {
        donorList = donorList.filter(d => d.phone && d.phone.includes(filters.phoneSearch));
      }
      if (filters.nameSearch) {
        const searchLower = filters.nameSearch.toLowerCase();
        donorList = donorList.filter(d => d.name && d.name.toLowerCase().includes(searchLower));
      }
      if (filters.availability === 'available') {
        donorList = donorList.filter(d => canDonate(d.lastDonationDate));
      } else if (filters.availability === 'unavailable') {
        donorList = donorList.filter(d => !canDonate(d.lastDonationDate));
      }

      if (filters.donationStatus === 'ready') {
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
        donorList = donorList.filter(d => {
          if (!d.lastDonationDate) return true;
          return new Date(d.lastDonationDate) <= fourMonthsAgo;
        });
      }

      // Radius filtering
      if (filters.radius > 0 && profile?.lat && profile?.lng) {
        donorList = donorList.filter(d => {
          if (!d.lat || !d.lng) return false;
          const dist = calculateDistance(profile.lat!, profile.lng!, d.lat, d.lng);
          return dist <= filters.radius;
        });
      }

      // Sort by proximity if requested and user is logged in
      if (filters.sortByProximity && profile) {
        donorList.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;
          
          if (a.upazila === profile.upazila) scoreA += 3;
          if (a.district === profile.district) scoreA += 2;
          if (a.division === profile.division) scoreA += 1;

          if (b.upazila === profile.upazila) scoreB += 3;
          if (b.district === profile.district) scoreB += 2;
          if (b.division === profile.division) scoreB += 1;

          return scoreB - scoreA; // Descending score
        });
      }

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

  const addToContacts = (donor: UserProfile) => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${donor.name}
TEL;TYPE=CELL:${donor.phone}
NOTE:Blood Group: ${donor.bloodGroup}, Location: ${donor.district}
END:VCARD`;
    
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${donor.name.replace(/\s+/g, '_')}_contact.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Contact file generated');
  };

  const toggleBookmark = async (donorUid: string) => {
    if (!profile) {
      toast.error('Please login to bookmark donors');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', profile.uid);
      const currentBookmarks = profile.bookmarks || [];
      const isBookmarked = currentBookmarks.includes(donorUid);
      
      const newBookmarks = isBookmarked 
        ? currentBookmarks.filter(uid => uid !== donorUid)
        : [...currentBookmarks, donorUid];
        
      await updateDoc(userRef, { bookmarks: newBookmarks });
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error('Failed to update bookmarks');
    }
  };

  const startChat = async (donor: UserProfile) => {
    if (!profile) {
      toast.error('Please login to message donors');
      return;
    }

    if (profile.uid === donor.uid) {
      toast.error("You can't message yourself");
      return;
    }

    try {
      // Check if room already exists
      const q = query(
        collection(db, 'chatRooms'),
        where('participants', 'array-contains', profile.uid)
      );
      const snapshot = await getDocs(q);
      let existingRoom = snapshot.docs.find(doc => doc.data().participants.includes(donor.uid));

      if (existingRoom) {
        navigate(`/messages?room=${existingRoom.id}`);
        return;
      }

      // Create new room
      const roomId = [profile.uid, donor.uid].sort().join('_');
      await setDoc(doc(db, 'chatRooms', roomId), {
        participants: [profile.uid, donor.uid],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: {
          [profile.uid]: 0,
          [donor.uid]: 0
        }
      });

      navigate(`/messages?room=${roomId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error('Failed to start conversation');
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

      {/* Prominent Search Fields */}
      <div className="max-w-xl mx-auto space-y-4">
        {/* Name Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search donor by name"
            value={filters.nameSearch}
            onChange={(e) => setFilters({ ...filters, nameSearch: e.target.value })}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none focus:border-red-600 dark:focus:border-red-600 shadow-sm text-lg transition-all"
          />
          {filters.nameSearch && (
            <button
              onClick={() => setFilters({ ...filters, nameSearch: '' })}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <X className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
            </button>
          )}
        </div>

        {/* Phone Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search donor by phone number (e.g. 01XXXXXXXXX)"
            value={filters.phoneSearch}
            onChange={(e) => setFilters({ ...filters, phoneSearch: e.target.value })}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none focus:border-red-600 dark:focus:border-red-600 shadow-sm text-lg transition-all"
          />
          {filters.phoneSearch && (
            <button
              onClick={() => setFilters({ ...filters, phoneSearch: '' })}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <X className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
        <button 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full flex justify-between items-center text-zinc-900 dark:text-white font-bold"
        >
          <span>Filters</span>
          {isFiltersOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {isFiltersOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
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
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-sm"
              >
                <option value="all">All</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Donation Status</label>
              <select
                value={filters.donationStatus}
                onChange={(e) => setFilters({ ...filters, donationStatus: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-sm"
              >
                <option value="all">Any Time</option>
                <option value="ready">Ready to Donate (4+ months)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Radius (km)</label>
              <select
                value={filters.radius}
                onChange={(e) => setFilters({ ...filters, radius: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 text-sm"
              >
                <option value={0}>Any</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>
            {profile && (
              <div className="space-y-1 flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.sortByProximity}
                    onChange={(e) => setFilters({ ...filters, sortByProximity: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-600 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Sort by Proximity</span>
                </label>
              </div>
            )}
            <button
              onClick={fetchDonors}
              className="py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <SearchIcon className="h-4 w-4" />
              {t('find_donor')}
            </button>
          </div>
        )}

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
          <DonorMap donors={donors} onDonorSelect={(donor) => navigate(`/user/${donor.uid}`)} />
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {donors.length > 0 ? donors.map((donor, index) => (
            <motion.div
              key={donor.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/user/${donor.uid}`)}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                          {donor.name}
                        </h3>
                        {donor.isVerified && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[8px] font-bold border border-blue-100 dark:border-blue-900/30">
                            <CheckCircle className="h-2.5 w-2.5 fill-blue-600/10" />
                            Verified
                          </div>
                        )}
                        {getBadge(donor.donationCount) && (
                          <div className={cn(
                            "flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-900/20 rounded-full text-[8px] font-bold border border-zinc-100 dark:border-zinc-800",
                            getBadge(donor.donationCount)?.color
                          )}>
                            <span>{getBadge(donor.donationCount)?.icon}</span>
                            {getBadge(donor.donationCount)?.name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold border",
                          canDonate(donor.lastDonationDate) 
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30" 
                            : "bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100 dark:border-red-900/30"
                        )}>
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            canDonate(donor.lastDonationDate) ? "bg-emerald-500" : "bg-red-500"
                          )} />
                          {canDonate(donor.lastDonationDate) ? "Available" : "Unavailable"}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {donor.district}, {donor.division}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(donor.uid);
                    }}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      profile?.bookmarks?.includes(donor.uid)
                        ? "bg-red-100 dark:bg-red-900/20 text-red-600"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                    title="Bookmark Donor"
                  >
                    <Bookmark className={cn("h-4 w-4", profile?.bookmarks?.includes(donor.uid) && "fill-current")} />
                  </button>
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
                      startChat(donor);
                    }}
                    className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    title="Message Donor"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToContacts(donor);
                    }}
                    className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    title="Add to Contacts"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
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
    </div>
  );
};

export default SearchDonors;
