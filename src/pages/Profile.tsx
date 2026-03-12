import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db, storage } from '../firebase/config';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, MapPin, Droplets, Calendar, CheckCircle, Shield, Heart, Scale, Ruler, Camera, Loader2, Share2, QrCode, MessageSquare, Sparkles, ArrowRight, Award, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5] font-sans selection:bg-red-100 dark:selection:bg-red-900/30">
      <div className="max-w-[1400px] mx-auto px-6 py-12 lg:py-20">
        
        {/* Hero Section: Split Layout */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">
          
          {/* Left Column: Profile Identity */}
          <div className="lg:col-span-5 space-y-12 sticky top-12">
            <motion.div 
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* Large Display Typography */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600 dark:text-red-500">
                    Verified Donor Profile
                  </span>
                  <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <h1 className="text-7xl lg:text-8xl font-black tracking-tighter leading-[0.85] uppercase">
                  {profile.name.split(' ')[0]}
                  <br />
                  <span className="text-zinc-300 dark:text-zinc-800">{profile.name.split(' ').slice(1).join(' ')}</span>
                </h1>
              </div>

              {/* Avatar with Editorial Mask */}
              <div className="relative group max-w-sm">
                <div className="aspect-[4/5] overflow-hidden rounded-[3rem] bg-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 transition-transform duration-700 group-hover:scale-[1.02]">
                  {formData.photoURL ? (
                    <img 
                      src={formData.photoURL} 
                      alt={profile.name} 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={120} className="text-zinc-200 dark:text-zinc-800" />
                    </div>
                  )}
                  
                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                    <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 hover:text-white transition-colors">
                      <Camera size={14} />
                      Update Portrait
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                {/* AI Sparkle Action */}
                <button
                  onClick={generateAIAvatar}
                  disabled={generatingAvatar}
                  className="absolute -top-6 -right-6 w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {generatingAvatar ? <Loader2 className="animate-spin" /> : <Sparkles size={28} />}
                </button>

                {uploading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-[3rem]">
                    <Loader2 className="animate-spin text-red-600" size={40} />
                  </div>
                )}
              </div>

              {/* Quick Stats Rail */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-zinc-100 dark:border-zinc-900">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Blood Type</div>
                  <div className="text-3xl font-black text-red-600">{profile.bloodGroup || '??'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lives Saved</div>
                  <div className="text-3xl font-black">{profile.donationCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", canDonate(profile.lastDonationDate) ? "bg-emerald-500" : "bg-red-500")} />
                    <span className="text-xs font-bold uppercase tracking-tighter">
                      {canDonate(profile.lastDonationDate) ? 'Ready' : 'Resting'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="lg:col-span-7 space-y-20">
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-red-600 dark:hover:bg-red-600 dark:hover:text-white transition-all shadow-2xl"
              >
                {isEditing ? 'Discard Changes' : 'Edit Profile Details'}
              </button>
              <button 
                onClick={() => {
                  navigator.share({
                    title: 'BloodTraking Profile',
                    url: `${window.location.origin}/user/${profile.uid}`
                  }).catch(() => {
                    navigator.clipboard.writeText(`${window.location.origin}/user/${profile.uid}`);
                    toast.success('Link copied to clipboard');
                  });
                }}
                className="w-16 h-16 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                <Share2 size={20} />
              </button>
            </div>

            {/* Dynamic Content: Form or Display */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] p-10 lg:p-16 border border-zinc-100 dark:border-zinc-800"
                >
                  <form onSubmit={handleUpdate} className="space-y-12">
                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Blood Group</label>
                        <select
                          value={formData.bloodGroup}
                          onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors appearance-none"
                        >
                          <option value="">Select</option>
                          {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Last Donation</label>
                        <input
                          type="date"
                          value={formData.lastDonationDate}
                          onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Division</label>
                        <select
                          value={formData.division}
                          onChange={(e) => setFormData({ ...formData, division: e.target.value, district: '' })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors appearance-none"
                        >
                          <option value="">Select</option>
                          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">District</label>
                        <select
                          value={formData.district}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          disabled={!formData.division}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors appearance-none disabled:opacity-30"
                        >
                          <option value="">Select</option>
                          {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Upazila / Area</label>
                        <input
                          type="text"
                          value={formData.upazila}
                          onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                          placeholder="Enter your upazila or area"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Height</label>
                        <input
                          type="text"
                          value={formData.height}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-xl font-bold focus:border-red-600 outline-none transition-colors"
                          placeholder="e.g. 5ft 8in"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Medical History & Notes</label>
                      <textarea
                        value={formData.medicalHistory}
                        onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                        rows={4}
                        className="w-full bg-white dark:bg-black/20 rounded-3xl p-8 text-lg font-medium border border-zinc-100 dark:border-zinc-800 focus:border-red-600 outline-none transition-colors resize-none"
                        placeholder="Any relevant medical information..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-6 bg-red-600 text-white rounded-full text-sm font-black uppercase tracking-[0.3em] hover:bg-red-700 transition-all shadow-2xl shadow-red-600/20"
                    >
                      Commit Changes
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-24"
                >
                  {/* Bio / About Section */}
                  <section className="space-y-8">
                    <h2 className="text-4xl font-black uppercase tracking-tighter">The Medical Record</h2>
                    <div className="grid md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Location & Reach</div>
                          <div className="flex items-center gap-4 text-xl font-bold">
                            <MapPin className="text-red-600" />
                            {profile.upazila ? `${profile.upazila}, ` : ''}{profile.district}, {profile.division}
                          </div>
                        </div>
                        <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Contact Protocol</div>
                          <div className="flex items-center gap-4 text-xl font-bold">
                            <Phone className="text-red-600" />
                            {profile.phone || 'Not Provided'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Weight</div>
                            <div className="flex items-center gap-4 text-xl font-bold">
                              <Scale className="text-red-600" />
                              {profile.weight ? `${profile.weight} kg` : 'N/A'}
                            </div>
                          </div>
                          <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Height</div>
                            <div className="flex items-center gap-4 text-xl font-bold">
                              <Ruler className="text-red-600" />
                              {profile.height || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-10 bg-black text-white rounded-[2.5rem] flex flex-col justify-between">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-8">Medical History</div>
                        <p className="text-lg font-medium leading-relaxed italic">
                          "{profile.medicalHistory || 'No medical history recorded for this donor.'}"
                        </p>
                        <div className="mt-8 flex justify-end">
                          <Shield className="text-red-600" size={32} />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Impact & History: Horizontal Scroll or Grid */}
                  <section className="space-y-12">
                    <div className="flex items-end justify-between">
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Donation Timeline</h2>
                      <span className="text-xs font-black uppercase tracking-widest text-red-600">{profile.donationCount} Entries</span>
                    </div>
                    
                    <div className="space-y-4">
                      {profile.donationCount > 0 ? (
                        [...Array(profile.donationCount)].map((_, i) => (
                          <div key={i} className="group flex items-center justify-between p-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 hover:border-red-600 transition-all">
                            <div className="flex items-center gap-8">
                              <div className="text-5xl font-black text-zinc-100 dark:text-zinc-800 group-hover:text-red-600/10 transition-colors">
                                0{i + 1}
                              </div>
                              <div>
                                <div className="text-xl font-black uppercase tracking-tight">Full Blood Donation</div>
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Regional Medical Center</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-black">
                                {new Date(new Date().getTime() - (i + 1) * 95 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </div>
                              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">
                          <p className="text-zinc-400 font-black uppercase tracking-widest">No history recorded yet</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* QR & Share: Editorial Card */}
                  <section className="bg-red-600 rounded-[4rem] p-12 lg:p-20 text-white flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
                    
                    <div className="p-6 bg-white rounded-[3rem] shadow-2xl shrink-0 rotate-3 hover:rotate-0 transition-transform duration-500">
                      <QRCodeSVG 
                        value={`${window.location.origin}/user/${profile.uid}`}
                        size={200}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div className="space-y-4">
                        <h2 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-none">
                          Digital Donor <br /> Passport
                        </h2>
                        <p className="text-red-100 text-lg font-medium max-w-md">
                          Your unique identifier for instant verification at any participating medical facility.
                        </p>
                      </div>
                      <div className="flex gap-4">
                        <button className="px-8 py-4 bg-white text-red-600 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors">
                          Download PNG
                        </button>
                        <button className="w-14 h-14 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
                          <Zap size={20} />
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* Feedback: Minimalist Form */}
                  <section className="space-y-8 pt-12 border-t border-zinc-100 dark:border-zinc-900">
                    <div className="max-w-xl">
                      <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Platform Feedback</h2>
                      <p className="text-zinc-500 font-medium mb-8">Help us refine the BloodTraking experience. Your insights drive our evolution.</p>
                      
                      <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="What can we improve?"
                          rows={3}
                          className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 py-4 text-lg font-medium focus:border-red-600 outline-none transition-colors resize-none"
                        />
                        <button
                          type="submit"
                          disabled={submittingFeedback || !feedback.trim()}
                          className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] hover:text-red-600 transition-colors disabled:opacity-30"
                        >
                          {submittingFeedback ? 'Submitting...' : 'Send Message'}
                          <ArrowRight size={16} />
                        </button>
                      </form>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* AI Avatar Preview Modal */}
      <AnimatePresence>
        {previewAvatar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white dark:bg-zinc-900 rounded-[4rem] p-12 max-w-lg w-full space-y-12 shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              
              <div className="text-center space-y-4">
                <h3 className="text-4xl font-black uppercase tracking-tighter">AI Portrait Ready</h3>
                <p className="text-zinc-500 font-medium">
                  A unique visual identity generated from your donor profile data.
                </p>
              </div>

              <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-2xl">
                <img 
                  src={previewAvatar} 
                  alt="AI Generated Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={cancelAvatarPreview}
                  disabled={uploading}
                  className="py-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={saveGeneratedAvatar}
                  disabled={uploading}
                  className="py-6 bg-red-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="animate-spin" /> : 'Apply Portrait'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
