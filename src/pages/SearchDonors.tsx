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
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-[10px] font-bold tracking-widest uppercase border border-red-100 dark:border-red-900/30">
          <Droplets className="h-3 w-3" />
          Donor Directory
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">{t('find_donor')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
          Search for verified blood donors in your area.
        </p>
      </div>

      {/* Prominent Search Fields */}
      <div className="max-w-2xl mx-auto grid md:grid-cols-2 gap-4">
        {/* Name Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-zinc-400 group-focus-within:text-red-600 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search by name"
            value={filters.nameSearch}
            onChange={(e) => setFilters({ ...filters, nameSearch: e.target.value })}
            className="input-field pl-12 py-4 text-base"
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
            placeholder="Search by phone"
            value={filters.phoneSearch}
            onChange={(e) => setFilters({ ...filters, phoneSearch: e.target.value })}
            className="input-field pl-12 py-4 text-base"
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
      <div className="card !p-6 space-y-6">
        <button 
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full flex justify-between items-center text-zinc-900 dark:text-white"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <SearchIcon className="h-4 w-4 text-red-600" />
            </div>
            <span className="font-black text-sm uppercase tracking-widest">Advanced Filters</span>
          </div>
          {isFiltersOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {isFiltersOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-2">
              <label className="label-text ml-1">{t('blood_group')}</label>
              <select
                value={filters.bloodGroup}
                onChange={(e) => setFilters({ ...filters, bloodGroup: e.target.value })}
                className="input-field py-2.5 text-xs"
              >
                <option value="">All Groups</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text ml-1">{t('division')}</label>
              <select
                value={filters.division}
                onChange={(e) => setFilters({ ...filters, division: e.target.value, district: '' })}
                className="input-field py-2.5 text-xs"
              >
                <option value="">All Divisions</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text ml-1">{t('district')}</label>
              <select
                value={filters.district}
                onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                disabled={!filters.division}
                className="input-field py-2.5 text-xs"
              >
                <option value="">All Districts</option>
                {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text ml-1">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                className="input-field py-2.5 text-xs"
              >
                <option value="all">Any Availability</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text ml-1">Status</label>
              <select
                value={filters.donationStatus}
                onChange={(e) => setFilters({ ...filters, donationStatus: e.target.value })}
                className="input-field py-2.5 text-xs"
              >
                <option value="all">Any Status</option>
                <option value="ready">Ready (4+ months)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="label-text ml-1">Radius (km)</label>
              <select
                value={filters.radius}
                onChange={(e) => setFilters({ ...filters, radius: Number(e.target.value) })}
                className="input-field py-2.5 text-xs"
              >
                <option value={0}>Any Distance</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>
            <button
              onClick={fetchDonors}
              className="btn-primary py-3 text-xs"
            >
              <SearchIcon className="h-4 w-4" />
              Search
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-6">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                viewMode === 'grid' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                viewMode === 'map' ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm" : "text-zinc-500"
              )}
            >
              <MapIcon className="h-4 w-4" />
              Map
            </button>
          </div>

          {profile && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.sortByProximity}
                  onChange={(e) => setFilters({ ...filters, sortByProximity: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 rounded-full peer-checked:bg-red-600 transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest group-hover:text-red-600 transition-colors">Sort by Proximity</span>
            </label>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="h-12 w-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin" />
          <p className="text-zinc-500 font-bold animate-pulse">Searching for donors...</p>
        </div>
      ) : viewMode === 'map' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[3rem] overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl"
        >
          <DonorMap donors={donors} onDonorSelect={(donor) => navigate(`/user/${donor.uid}`)} />
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {donors.length > 0 ? donors.map((donor, index) => (
            <motion.div
              key={donor.uid}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/user/${donor.uid}`)}
              className="card group cursor-pointer hover:border-red-600/30 transition-all flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                    {donor.photoURL ? (
                      <img src={donor.photoURL} alt={donor.name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-zinc-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-zinc-900 dark:text-white leading-tight">
                        {donor.name}
                      </h3>
                      {donor.isVerified && (
                        <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      <MapPin className="h-3 w-3 text-red-600" />
                      {donor.upazila}, {donor.district}
                    </div>
                  </div>
                </div>
                <div className="h-12 w-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-red-100 dark:border-red-900/30">
                  {donor.bloodGroup}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Donations</div>
                  <div className="text-lg font-black text-zinc-900 dark:text-white">{donor.donationCount}</div>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</div>
                  <div className={cn(
                    "text-xs font-black uppercase tracking-widest",
                    canDonate(donor.lastDonationDate) ? "text-emerald-600" : "text-red-600"
                  )}>
                    {canDonate(donor.lastDonationDate) ? "Available" : "Wait"}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex gap-2">
                <a
                  href={`tel:${donor.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
                >
                  <Phone className="h-4 w-4" />
                  {t('call')}
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startChat(donor);
                  }}
                  className="p-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  title="Message Donor"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(donor.uid);
                  }}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all",
                    profile?.bookmarks?.includes(donor.uid)
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Bookmark className={cn("h-5 w-5", profile?.bookmarks?.includes(donor.uid) && "fill-current")} />
                </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-32 space-y-6">
              <div className="h-24 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <SearchIcon className="h-12 w-12 text-zinc-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">No Donors Found</h3>
                <p className="text-zinc-500 font-medium max-w-sm mx-auto">We couldn't find any donors matching your current filters. Try broadening your search.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDonors;
