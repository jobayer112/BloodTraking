import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, MapPin, Calendar, Scale, Ruler, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BLOOD_GROUPS, DIVISIONS, DISTRICTS_BY_DIVISION } from '../utils/helpers';

const steps = [
  { id: 'basic', title: 'Basic Info', icon: Droplets },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'health', title: 'Health Stats', icon: Scale },
  { id: 'confirm', title: 'Confirmation', icon: ShieldCheck },
];

const DonorRegistration = () => {
  const { profile, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: profile?.bloodGroup || '',
    division: profile?.division || '',
    district: profile?.district || '',
    upazila: profile?.upazila || '',
    weight: profile?.weight || '',
    height: profile?.height || '',
    lastDonationDate: profile?.lastDonationDate || '',
    medicalHistory: profile?.medicalHistory || '',
    isDonor: true,
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const updatedData = {
        ...formData,
        role: 'donor',
        weight: Number(formData.weight) || null,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userRef, updatedData);
      updateProfileState({ ...profile, ...updatedData } as any);
      toast.success('Successfully registered as a donor!');
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const availableDistricts = formData.division ? DISTRICTS_BY_DIVISION[formData.division] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-red-600 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Become a Life Saver</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Complete your registration to join our donor community.</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                  isActive ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-110' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-red-600' : 'text-zinc-400'}`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`absolute top-5 left-10 w-[calc(100%+20px)] h-0.5 -z-10 transition-colors duration-500 ${
                    index < currentStep ? 'bg-red-600' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="label-text">Blood Group</label>
                    <div className="grid grid-cols-4 gap-3">
                      {BLOOD_GROUPS.map(bg => (
                        <button
                          key={bg}
                          onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                          className={`py-4 rounded-2xl font-bold transition-all border-2 ${
                            formData.bloodGroup === bg 
                              ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' 
                              : 'bg-zinc-50 dark:bg-zinc-800 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Last Donation Date</label>
                    <input
                      type="date"
                      value={formData.lastDonationDate}
                      onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
                      className="input-field"
                    />
                    <p className="text-[10px] text-zinc-400">Leave blank if you haven't donated before.</p>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-text">Division</label>
                      <select
                        value={formData.division}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value, district: '' })}
                        className="input-field"
                      >
                        <option value="">Select Division</option>
                        {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-text">District</label>
                      <select
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        disabled={!formData.division}
                        className="input-field"
                      >
                        <option value="">Select District</option>
                        {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Upazila / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Dhanmondi"
                      value={formData.upazila}
                      onChange={(e) => setFormData({ ...formData, upazila: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-text">Weight (kg)</label>
                      <input
                        type="number"
                        placeholder="e.g. 70"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-text">Height</label>
                      <input
                        type="text"
                        placeholder="e.g. 5'8''"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="label-text">Medical History (Optional)</label>
                    <textarea
                      placeholder="Any chronic conditions or allergies..."
                      value={formData.medicalHistory}
                      onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="text-center space-y-6 py-4">
                  <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Ready to Join?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">By clicking register, you agree to be contacted for blood donation requests in your area.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Blood Group</div>
                      <div className="text-xl font-bold text-red-600">{formData.bloodGroup}</div>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Location</div>
                      <div className="text-sm font-bold truncate">{formData.district}</div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-2 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-0"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
            
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary min-w-[160px]"
              >
                {loading ? 'Registering...' : 'Register as Donor'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 0 && !formData.bloodGroup) ||
                  (currentStep === 1 && (!formData.division || !formData.district))
                }
                className="btn-primary min-w-[120px]"
              >
                Next
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonorRegistration;
