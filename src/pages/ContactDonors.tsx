import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Phone, MapPin, CheckCircle, Search, RefreshCw, Navigation, Share2, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { UserProfile } from '../types';
import { cn, canDonate } from '../utils/helpers';
import { toast } from 'react-hot-toast';

const ContactDonors = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [matchedDonors, setMatchedDonors] = useState<UserProfile[]>([]);
  const [unregisteredContacts, setUnregisteredContacts] = useState<{name: string, phone: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Check if Contact Picker API is supported
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      setIsSupported(false);
    }

    // Request Location Permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Location error:", error);
          toast.error(t('location_permission_required'));
        }
      );
    }
  }, [t]);

  const [unsubscribers, setUnsubscribers] = useState<(() => void)[]>([]);

  useEffect(() => {
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [unsubscribers]);

  const syncContacts = async () => {
    if (!isSupported) {
      toast.error(t('contacts_not_supported'));
      return;
    }

    try {
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      
      // @ts-ignore - Contact Picker API is experimental
      const contacts = await navigator.contacts.select(props, opts);
      
      if (!contacts || contacts.length === 0) return;

      setLoading(true);
      
      // Extract phone numbers and normalize them
      const contactMap = new Map<string, string>();
      contacts.forEach((c: any) => {
        if (c.tel && c.tel.length > 0) {
          c.tel.forEach((t: string) => {
            const digits = t.replace(/\D/g, '');
            const normalized = digits.length >= 11 ? digits.slice(-11) : digits;
            if (normalized) {
              contactMap.set(normalized, c.name?.[0] || 'Unknown Contact');
            }
          });
        }
      });

      const phoneNumbers = Array.from(contactMap.keys());

      if (phoneNumbers.length === 0) {
        setLoading(false);
        toast.error("No valid phone numbers found in selected contacts.");
        return;
      }

      // Clear previous listeners
      unsubscribers.forEach(unsub => unsub());
      const newUnsubs: (() => void)[] = [];

      // Chunk the requests (Firestore 'in' limit is 30)
      const chunkSize = 30;
      const chunks = [];
      for (let i = 0; i < phoneNumbers.length; i += chunkSize) {
        chunks.push(phoneNumbers.slice(i, i + chunkSize));
      }

      setMatchedDonors([]); // Reset list for new sync
      setUnregisteredContacts([]);

      for (const chunk of chunks) {
        const q = query(
          collection(db, 'users'),
          where('phone', 'in', chunk),
          where('role', '==', 'donor')
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const matches = snapshot.docs
            .map(doc => doc.data() as UserProfile)
            .filter(donor => canDonate(donor.lastDonationDate));
          
          setMatchedDonors(prev => {
            // Remove old versions of these users and add new ones
            const otherDonors = prev.filter(p => !chunk.includes(p.phone));
            return [...otherDonors, ...matches];
          });

          setUnregisteredContacts(prev => {
            const matchedPhones = snapshot.docs.map(doc => doc.data().phone);
            const unmatchedInChunk = chunk.filter(p => !matchedPhones.includes(p));
            
            const newUnregistered = unmatchedInChunk.map(phone => ({
              name: contactMap.get(phone) || 'Unknown Contact',
              phone
            }));

            const otherUnregistered = prev.filter(p => !chunk.includes(p.phone));
            return [...otherUnregistered, ...newUnregistered];
          });
        }, (error) => {
          console.error("Firestore onSnapshot error:", error);
          toast.error("Error syncing contacts: " + error.message);
        });
        newUnsubs.push(unsubscribe);
      }

      setUnsubscribers(newUnsubs);
      toast.success(t('finding_contacts'));
      setLoading(false);
    } catch (error: any) {
      console.error("Contact sync error:", error);
      if (error.name === 'SecurityError') {
        toast.error(t('contacts_permission_denied'));
      } else {
        toast.error(error.message);
      }
      setLoading(false);
    }
  };

  const handleInvite = async (phone?: string) => {
    const inviteText = `Join BloodBond and become a lifesaver! Register as a blood donor today.`;
    const inviteUrl = window.location.origin;

    if (phone) {
      // Invite specific contact via SMS or WhatsApp
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // Try to open WhatsApp first, fallback to SMS
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(inviteText + ' ' + inviteUrl)}`, '_blank');
      } else {
        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(inviteText + ' ' + inviteUrl)}`, '_blank');
      }
      return;
    }

    // General invite using Web Share API
    const shareData = {
      title: 'BloodBond - Save Lives',
      text: inviteText,
      url: inviteUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Thanks for sharing!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share.');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        toast.success('Invite link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="h-20 w-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
          <Users className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">{t('contact_donors')}</h1>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
          Find which of your phone contacts are registered as blood donors. Everything updates in real-time.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-4">
          {!isSupported ? (
            <div className="w-full p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-3xl text-center space-y-2">
              <p className="text-amber-700 dark:text-amber-400 font-medium">{t('contacts_not_supported')}</p>
              <p className="text-sm text-amber-600/70">Try using a mobile browser like Chrome on Android for this feature.</p>
            </div>
          ) : (
            <button
              onClick={syncContacts}
              disabled={loading}
              className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {t('sync_contacts')}
            </button>
          )}

          <button
            onClick={() => handleInvite()}
            className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/20"
          >
            <Share2 className="h-5 w-5" />
            Invite Friends
          </button>
        </div>

        {userLocation && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900/30">
            <Navigation className="h-3 w-3" />
            Location Active
          </div>
        )}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : matchedDonors.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {matchedDonors.map((donor, index) => (
              <motion.div
                key={donor.uid}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {donor.photoURL ? (
                        <img src={donor.photoURL} alt={donor.name} className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        <Users className="h-8 w-8 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          {donor.name}
                          <div className={cn(
                            "h-2 w-2 rounded-full shadow-sm",
                            canDonate(donor.lastDonationDate) ? "bg-emerald-500" : "bg-red-500"
                          )} />
                        </h3>
                        {donor.isVerified && <CheckCircle className="h-3 w-3 text-blue-500 fill-current" />}
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

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <Droplets className="h-4 w-4 text-red-500" />
                    <span>{donor.donationCount} {t('donation_count')}</span>
                  </div>
                  <a
                    href={`tel:${donor.phone}`}
                    className="p-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-all"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          !loading && matchedDonors.length === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Search className="h-10 w-10 text-zinc-400" />
              </div>
              <p className="text-zinc-500 font-medium">{t('no_contacts_found')}</p>
            </div>
          )
        )}

        {!loading && unregisteredContacts.length > 0 && (
          <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Invite to BloodBond</h2>
              <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-sm font-medium">
                {unregisteredContacts.length} Contacts
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {unregisteredContacts.map((contact, index) => (
                <motion.div
                  key={`${contact.phone}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Users className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{contact.name}</h3>
                      <p className="text-xs text-zinc-500">{contact.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleInvite(contact.phone)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Invite
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Droplets = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  </svg>
);

export default ContactDonors;
