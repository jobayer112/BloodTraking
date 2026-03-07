import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileState: (newProfile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch profile from Firestore
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          // Force admin role for the specific email or UID
          const isAdmin = firebaseUser.email === 'zobaerhasan431@gmail.com' || firebaseUser.uid === 'cWfThoHPOKdviqdkegbyAkDKLjA3';
          if (isAdmin && data.role !== 'admin') {
            data.role = 'admin';
            data.isVerified = true;
            await updateDoc(docRef, { role: 'admin', isVerified: true });
          }

          if (data.isBanned) {
            await firebaseSignOut(auth);
            setProfile(null);
            setUser(null);
            return;
          }

          setProfile(data);
        } else {
          // Create a default profile if it doesn't exist (e.g., first time Google login)
          const isAdmin = firebaseUser.email === 'zobaerhasan431@gmail.com' || firebaseUser.uid === 'cWfThoHPOKdviqdkegbyAkDKLjA3';
          
          // Check for referral in URL
          const urlParams = new URLSearchParams(window.location.search);
          const referralId = urlParams.get('ref');

          const newProfile: Partial<UserProfile> = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: isAdmin ? 'admin' : 'donor',
            isVerified: isAdmin,
            donationCount: 0,
            inviteCount: 0,
            lastDonationDate: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (referralId) {
            newProfile.invitedBy = referralId;
            // Increment inviter's count
            try {
              await updateDoc(doc(db, 'users', referralId), {
                inviteCount: increment(1)
              });
            } catch (e) {
              console.error("Failed to increment inviter count", e);
            }
          }

          // Save the new profile
          await setDoc(docRef, newProfile);
          
          setProfile(newProfile as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Sign In Error", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Sign Out Error", error);
    }
  };

  const updateProfileState = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, updateProfileState }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
