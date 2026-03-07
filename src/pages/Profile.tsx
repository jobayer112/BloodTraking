import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db, storage } from '../firebase/config';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Droplets, Calendar, CheckCircle, Shield, Heart, Scale, Ruler, Camera, Loader2, Share2, QrCode, MessageSquare, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION, cn, canDonate, getBadge } from '../utils/helpers';

const Profile = () => {
  const { t } = useTranslation();
  const { profile, updateProfileState } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bloodGroup: '',
    division: '',
    district: '',
    upazila: '',
    weight: '' as string | number,
    height: '',
    photoURL: '',
    lastDonationDate: '',
    medicalHistory: '',
    donationPreferences: '',
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
        photoURL: profile.photoURL || '',
        lastDonationDate: profile.lastDonationDate || '',
        medicalHistory: profile.medicalHistory || '',
        donationPreferences: profile.donationPreferences || '',
      });
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Phone validation
    const phoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid Bangladeshi phone number (e.g., 01712345678)');
      return;
    }

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB for mobile compatibility)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Use a clean filename to avoid mobile character issues
      const extension = file.name.split('.').pop();
      const fileName = `profile_${profile.uid}_${Date.now()}.${extension}`;
      const storageRef = ref(storage, `profiles/${profile.uid}/${fileName}`);
      
      // OPTIMISTIC UPDATE: Show image immediately
      const objectUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, photoURL: objectUrl }));
      updateProfileState({ ...profile, photoURL: objectUrl } as any);
      
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          // Progress monitoring if needed
        }, 
        (error) => {
          console.error("Upload error state:", error);
          toast.error('Upload failed: ' + error.message);
          setUploading(false);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update Firestore
            const userRef = doc(db, 'users', profile.uid);
            await updateDoc(userRef, { 
              photoURL: downloadURL,
              updatedAt: new Date().toISOString()
            });

            // Update Auth Profile
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { photoURL: downloadURL });
            }
            
            // Update local state with final URL
            setFormData(prev => ({ ...prev, photoURL: downloadURL }));
            updateProfileState({ ...profile, photoURL: downloadURL } as any);
            
            toast.success('Profile picture updated!');
          } catch (err: any) {
            console.error("Error getting download URL:", err);
            toast.error('Failed to get image URL');
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error("Upload error catch:", error);
      toast.error('Failed to upload image');
      setUploading(false);
    }
  };

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const generateAIAvatar = async () => {
    if (!profile) return;
    setGeneratingAvatar(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Personalize prompt based on available profile data
      const name = profile.name || '';
      const genderHint = name.toLowerCase().includes('mr') ? 'male' : 
                        name.toLowerCase().includes('ms') || name.toLowerCase().includes('mrs') ? 'female' : 'person';
      
      const prompt = `A clean, modern, minimalist 3D avatar for a blood donor profile. 
      The character is a friendly ${genderHint}. 
      They are wearing casual clothes with a subtle red accent color to represent blood donation. 
      The background is a solid, soft light color. 
      The style is 3D render, high quality, 8k resolution, cute and approachable.
      Blood group ${profile.bloodGroup || 'O+'} badge visible on shirt.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let base64Image = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) throw new Error('Failed to generate image');

      // Convert base64 to blob
      const byteCharacters = atob(base64Image);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const file = new File([blob], `ai_avatar_${Date.now()}.png`, { type: 'image/png' });

      // Set preview instead of uploading immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewAvatar(objectUrl);
      setPreviewFile(file);

    } catch (error: any) {
      console.error("AI Avatar generation error:", error);
      toast.error('Failed to generate AI Avatar');
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const saveGeneratedAvatar = async () => {
    if (!previewFile || !profile) return;
    setUploading(true);
    
    try {
      // Upload to Firebase
      const storageRef = ref(storage, `profiles/${profile.uid}/${previewFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, previewFile);

      uploadTask.on('state_changed', null, 
        (error) => {
          toast.error('Failed to save AI avatar');
          setUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update Firestore
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, { 
            photoURL: downloadURL, 
            updatedAt: new Date().toISOString() 
          });
          
          // Update Auth
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
          }
          
          // Update local state
          setFormData(prev => ({ ...prev, photoURL: downloadURL }));
          updateProfileState({ ...profile, photoURL: downloadURL } as any);
          
          // Cleanup
          if (previewAvatar) URL.revokeObjectURL(previewAvatar);
          setPreviewAvatar(null);
          setPreviewFile(null);
          setUploading(false);
          toast.success('New profile picture saved!');
        }
      );
    } catch (error) {
      console.error("Save avatar error:", error);
      toast.error('Failed to save avatar');
      setUploading(false);
    }
  };

  const cancelAvatarPreview = () => {
    if (previewAvatar) URL.revokeObjectURL(previewAvatar);
    setPreviewAvatar(null);
    setPreviewFile(null);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !profile) return;
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: profile.uid,
        userName: profile.name,
        userEmail: profile.email,
        message: feedback,
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      setFeedback('');
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (!profile) return null;

  const availableDistricts = formData.division ? DISTRICTS_BY_DIVISION[formData.division] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
      >
        {/* Profile Header */}
        <div className="h-24 bg-red-600 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="relative group">
              <label className="h-24 w-24 rounded-3xl bg-white dark:bg-zinc-800 p-1 shadow-xl block overflow-hidden cursor-pointer ring-4 ring-white dark:ring-zinc-900 transition-transform hover:scale-105">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt={profile.name} className="h-full w-full rounded-[1.25rem] object-cover" />
                ) : (
                  <div className="h-full w-full rounded-[1.25rem] bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                    <User className="h-12 w-12 text-zinc-400" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black/40 rounded-[1.25rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>
          
          {/* AI Avatar Button */}
          <div className="absolute -bottom-10 right-6">
            <button
              onClick={generateAIAvatar}
              disabled={generatingAvatar}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm disabled:opacity-50"
            >
              {generatingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              ) : (
                <Sparkles className="h-4 w-4 text-red-600" />
              )}
              <span className="hidden sm:inline">Generate Avatar</span>
            </button>
          </div>
        </div>

        <div className="pt-12 pb-6 px-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  {profile.name}
                  <div className={cn(
                    "h-3 w-3 rounded-full shadow-sm",
                    canDonate(profile.lastDonationDate) ? "bg-emerald-500" : "bg-red-500"
                  )} />
                </h1>
                {profile.isVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle className="h-2.5 w-2.5 fill-blue-600/10" />
                    Verified
                  </div>
                )}
                {getBadge(profile.donationCount) && (
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-0.5 bg-zinc-50 dark:bg-zinc-900/20 rounded-full text-[10px] font-bold border border-zinc-100 dark:border-zinc-800",
                    getBadge(profile.donationCount)?.color
                  )}>
                    <span>{getBadge(profile.donationCount)?.icon}</span>
                    {getBadge(profile.donationCount)?.name}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
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
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{t('last_donation')}</label>
                <input
                  type="date"
                  value={formData.lastDonationDate}
                  onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Medical History</label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                  placeholder="Any chronic conditions, allergies, or recent surgeries..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 resize-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Donation Preferences</label>
                <textarea
                  value={formData.donationPreferences}
                  onChange={(e) => setFormData({ ...formData, donationPreferences: e.target.value })}
                  placeholder="Preferred donation times, locations, or other preferences..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-red-600 resize-none"
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
              <button
                type="submit"
                className="md:col-span-2 py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                {t('save_changes')}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <Droplets className="h-5 w-5 text-red-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('blood_group')}</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-white">{profile.bloodGroup || 'Not Set'}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('division')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{profile.division || 'Not Set'}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('district')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{profile.district || 'Not Set'}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('last_donation')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">
                  {profile.donationCount > 0 ? (profile.lastDonationDate || 'Not Set') : 'Never'}
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <Scale className="h-5 w-5 text-amber-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('weight')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{profile.weight ? `${profile.weight} kg` : 'Not Set'}</div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-1">
                <Ruler className="h-5 w-5 text-purple-600" />
                <div className="text-[10px] font-bold text-zinc-500 uppercase">{t('height')}</div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">{profile.height || 'Not Set'}</div>
              </div>
            </div>
          )}

          {!isEditing && (profile.medicalHistory || profile.donationPreferences) && (
            <div className="mt-6 space-y-4">
              {profile.medicalHistory && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Medical History</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{profile.medicalHistory}</p>
                </div>
              )}
              {profile.donationPreferences && (
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-2">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Donation Preferences</div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{profile.donationPreferences}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-600" />
            Impact
          </h3>
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-xl">
            <div className="space-y-0.5">
              <div className="text-xl font-bold text-red-600">{profile.donationCount}</div>
              <div className="text-[10px] font-medium text-zinc-500">Donations</div>
            </div>
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Heart className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Social
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl text-center">
              <div className="text-xl font-bold text-emerald-600">{profile.followers?.length || 0}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Followers</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-center">
              <div className="text-xl font-bold text-blue-600">{profile.following?.length || 0}</div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase">Following</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            Contact
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate">{profile.phone || 'No phone'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium capitalize truncate">{profile.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-xl flex flex-col md:flex-row items-center gap-8"
      >
        <div className="p-4 bg-white rounded-2xl shadow-inner border border-zinc-100">
          <QRCodeSVG 
            value={`${window.location.origin}/user/${profile.uid}`}
            size={160}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "/logo.png",
              x: undefined,
              y: undefined,
              height: 24,
              width: 24,
              excavate: true,
            }}
          />
        </div>
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-2 text-red-600">
            <QrCode className="h-5 w-5" />
            <h3 className="text-xl font-bold">Your Personal QR Code</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
            This QR code links directly to your public profile. Other donors can scan this to quickly find your contact information and blood group.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
            <button 
              onClick={() => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                  const url = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  link.download = `bloodtraking-qr-${profile.name}.png`;
                  link.href = url;
                  link.click();
                } else {
                  // Fallback for SVG
                  const svg = document.querySelector('svg[role="img"]');
                  if (svg) {
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx?.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL("image/png");
                      const downloadLink = document.createElement("a");
                      downloadLink.download = `bloodtraking-qr-${profile.name}.png`;
                      downloadLink.href = pngFile;
                      downloadLink.click();
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(svgData);
                  }
                }
              }}
              className="px-6 py-2 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            >
              Download QR
            </button>
            <button 
              onClick={() => {
                navigator.share({
                  title: 'My BloodTraking Profile',
                  text: `Check out my blood donor profile on BloodTraking!`,
                  url: `${window.location.origin}/user/${profile.uid}`
                }).catch(() => {
                  navigator.clipboard.writeText(`${window.location.origin}/user/${profile.uid}`);
                  toast.success('Profile link copied!');
                });
              }}
              className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              Share Profile
            </button>
          </div>
        </div>
      </motion.div>

      {/* Share & Invite */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-600/20"
      >
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
            <Share2 className="h-5 w-5" />
            Invite Your Friends
          </h3>
          <p className="text-sm text-red-100 max-w-md">
            Help us save more lives by inviting your friends and family to join the BloodTraking community.
          </p>
        </div>
        <Link 
          to="/invite"
          className="px-8 py-3 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all shadow-lg"
        >
          Get Invite Link
        </Link>
      </motion.div>

      {/* Donation History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-red-600" />
            History
          </h3>
          <button className="text-xs font-bold text-red-600 hover:underline">Add Record</button>
        </div>
        <div className="p-4">
          {profile.donationCount > 0 ? (
            <div className="space-y-3">
              {/* Simulated history */}
              {[...Array(profile.donationCount)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                      <Droplets className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-bold text-xs">Blood Donation</div>
                      <div className="text-[10px] text-zinc-500">Hospital General</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xs text-zinc-900 dark:text-white">
                      {new Date(new Date().getTime() - (i + 1) * 95 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600 uppercase">Done</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-6 w-6 text-zinc-300" />
              </div>
              <p className="text-xs text-zinc-500 font-medium">No records found.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* App Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            App Feedback
          </h3>
          <p className="text-xs text-zinc-500 mt-1">Help us improve BloodTraking by sharing your thoughts or reporting issues.</p>
        </div>
        <div className="p-4">
          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What do you like? What could be better? Found a bug?"
              rows={4}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 resize-none text-sm"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingFeedback || !feedback.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submittingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
      {/* AI Avatar Preview Modal */}
      {previewAvatar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl border border-zinc-100 dark:border-zinc-800"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">AI Avatar Generated!</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Here is your unique avatar based on your profile. Would you like to set it as your profile picture?
              </p>
            </div>

            <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-800 shadow-lg">
              <img 
                src={previewAvatar} 
                alt="AI Generated Avatar" 
                className="w-full h-full object-cover"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={cancelAvatarPreview}
                disabled={uploading}
                className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveGeneratedAvatar}
                disabled={uploading}
                className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Avatar
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={generateAIAvatar}
              disabled={uploading || generatingAvatar}
              className="w-full py-2 text-sm font-medium text-zinc-500 hover:text-red-600 transition-colors flex items-center justify-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Generate New One
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;
