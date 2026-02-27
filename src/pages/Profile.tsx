import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Droplets, Calendar, CheckCircle, Shield, Heart, Scale, Ruler, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION } from '../utils/helpers';

const Profile = () => {
  const { t } = useTranslation();
  const { profile, updateProfileState } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bloodGroup: '',
    division: '',
    district: '',
    upazila: '',
    weight: '' as string | number,
    height: '',
    isAvailable: true,
    photoURL: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bloodGroup: profile.bloodGroup || '',
        division: profile.division || '',
        district: profile.district || '',
        upazila: profile.upazila || '',
        weight: profile.weight || '',
        height: profile.height || '',
        isAvailable: profile.isAvailable ?? true,
        photoURL: profile.photoURL || '',
      });
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatedData = {
        ...formData,
        weight: Number(formData.weight) || null,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userRef, updatedData);
      updateProfileState({ ...profile, ...updatedData } as any);
      setIsEditing(false);
      toast.success(t('save_changes'));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (!profile) return null;

  const availableDistricts = formData.division ? DISTRICTS_BY_DIVISION[formData.division] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
      >
        {/* Profile Header */}
        <div className="h-32 bg-red-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="h-24 w-24 rounded-2xl bg-white dark:bg-zinc-800 p-1 shadow-lg group relative cursor-pointer">
              {formData.photoURL ? (
                <img src={formData.photoURL} alt={profile.name} className="h-full w-full rounded-xl object-cover" />
              ) : (
                <div className="h-full w-full rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-zinc-400" />
                </div>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{profile.name}</h1>
                {profile.isVerified && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle className="h-3 w-3 fill-blue-600/10" />
                    Verified Donor
                  </div>
                )}
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">{profile.email}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              {isEditing ? t('cancel') : t('edit_profile')}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdate} className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('blood_group')}</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Select Group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('division')}</label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value, district: '' })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Select Division</option>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('district')}</label>
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  disabled={!formData.division}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50"
                >
                  <option value="">Select District</option>
                  {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('upazila')}</label>
                <input
                  type="text"
                  value={formData.upazila}
                  onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('weight')}</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('height')}</label>
                <input
                  type="text"
                  placeholder="e.g. 5'8''"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Profile Picture URL</label>
                <input
                  type="text"
                  value={formData.photoURL}
                  onChange={(e) => setFormData({ ...formData, photoURL: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className="h-5 w-5 rounded border-zinc-300 text-red-600 focus:ring-red-600"
                />
                <label htmlFor="available" className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {t('available')}
                </label>
              </div>
              <button
                type="submit"
                className="md:col-span-2 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                {t('save_changes')}
              </button>
            </form>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                <Droplets className="h-6 w-6 text-red-600" />
                <div className="text-sm font-bold text-zinc-500 uppercase">{t('blood_group')}</div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-white">{profile.bloodGroup || 'Not Set'}</div>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                <MapPin className="h-6 w-6 text-blue-600" />
                <div className="text-sm font-bold text-zinc-500 uppercase">{t('district')}</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.district || 'Not Set'}</div>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                <Calendar className="h-6 w-6 text-emerald-600" />
                <div className="text-sm font-bold text-zinc-500 uppercase">{t('last_donation')}</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.lastDonationDate || 'Never'}</div>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                <Scale className="h-6 w-6 text-amber-600" />
                <div className="text-sm font-bold text-zinc-500 uppercase">{t('weight')}</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.weight ? `${profile.weight} kg` : 'Not Set'}</div>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                <Ruler className="h-6 w-6 text-purple-600" />
                <div className="text-sm font-bold text-zinc-500 uppercase">{t('height')}</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">{profile.height || 'Not Set'}</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats & Badges */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Donation Impact
          </h3>
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-red-600">{profile.donationCount}</div>
              <div className="text-sm font-medium text-zinc-500">Total Donations</div>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Contact Information
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{profile.phone || 'No phone number added'}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium capitalize">{profile.role} Account</span>
            </div>
          </div>
        </div>
      </div>

      {/* Donation History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden"
      >
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-600" />
            Donation History
          </h3>
          <button className="text-sm font-bold text-red-600 hover:underline">Add Record</button>
        </div>
        <div className="p-8">
          {profile.donationCount > 0 ? (
            <div className="space-y-4">
              {/* Simulated history */}
              {[...Array(profile.donationCount)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                      <Droplets className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-bold">Blood Donation</div>
                      <div className="text-xs text-zinc-500">Hospital General, Dhaka</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {new Date(new Date().getTime() - (i + 1) * 95 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Completed</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-zinc-300" />
              </div>
              <p className="text-zinc-500 font-medium">No donation records found.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
