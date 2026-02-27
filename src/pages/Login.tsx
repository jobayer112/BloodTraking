import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Chrome, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Login = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formatPhone = phoneNumber.startsWith('+') ? phoneNumber : `+88${phoneNumber}`;
      const result = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
      setConfirmationResult(result);
      toast.success(t('otp_sent'));
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // Check if profile exists
      const docSnap = await getDoc(doc(db, 'users', user.uid));
      if (!docSnap.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phone: user.phoneNumber,
          name: 'Anonymous Donor',
          role: 'donor',
          isAvailable: true,
          isVerified: false,
          donationCount: 0,
          lastDonationDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      toast.success('Logged in successfully!');
      navigate('/profile');
    } catch (error: any) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Welcome back!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create initial profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          name: email.split('@')[0],
          role: 'donor',
          isAvailable: true,
          isVerified: false,
          donationCount: 0,
          lastDonationDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success('Account created! Please complete your profile.');
      }
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Logged in with Google');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-zinc-50 dark:bg-zinc-950">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800"
      >
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto">
            <LogIn className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {isLogin ? t('welcome_back') : t('create_account')}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            {isLogin ? t('login_desc') : t('signup_desc')}
          </p>
        </div>

        <div id="recaptcha-container"></div>

        {authMethod === 'email' ? (
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                <input
                  type="email"
                  placeholder={t('email_address')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                <input
                  type="password"
                  placeholder={t('password')}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {loading ? t('processing') : (isLogin ? t('sign_in') : t('sign_up'))}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmationResult ? handleVerifyOtp : handlePhoneSignIn} className="space-y-6">
            {!confirmationResult ? (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                  <input
                    type="tel"
                    placeholder={t('phone')}
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-zinc-500">We'll send a 6-digit OTP to verify your number.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder={t('enter_otp')}
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-red-600 outline-none transition-all tracking-[0.5em] text-center font-bold"
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => setConfirmationResult(null)}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  {t('change_phone')}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {loading ? t('processing') : (confirmationResult ? t('verify_otp') : t('send_otp'))}
            </button>
          </form>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">{t('or_continue_with')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGoogleSignIn}
            className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            <Chrome className="h-5 w-5" />
            <span className="font-medium">{t('google')}</span>
          </button>
          <button
            onClick={() => setAuthMethod(authMethod === 'email' ? 'phone' : 'email')}
            className="flex items-center justify-center gap-2 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
          >
            {authMethod === 'email' ? (
              <>
                <Phone className="h-5 w-5" />
                <span className="font-medium">{t('phone_login')}</span>
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                <span className="font-medium">{t('email_login')}</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-zinc-500 dark:text-zinc-400">
          {isLogin ? t('dont_have_account') : t('already_have_account')}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-red-600 font-bold ml-1 hover:underline"
          >
            {isLogin ? t('sign_up') : t('sign_in')}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
