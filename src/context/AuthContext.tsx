import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

export type UserRole = 'user' | 'host' | 'admin' | 'dj' | 'instructor' | 'media';

export type ViewMode = 'admin' | 'professional' | 'participant';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: any;
  followersCount?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, viewMode: 'participant', setViewMode: () => {}, refreshProfile: async () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('participant');

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
      }
    } catch (error) {
      console.error("Profile refresh error:", error);
    }
  };

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          
          // Initial viewMode logic
          if (data.role === 'admin') setViewMode('admin');
          else if (['host', 'dj', 'instructor', 'media'].includes(data.role)) setViewMode('professional');
          else setViewMode('participant');
        } else {
          // Create new profile
          let intendedRole = window.sessionStorage.getItem('intendedRole') as UserRole || 'user';
          if (currentUser.email === 'aimaster1004@gmail.com' && currentUser.emailVerified) {
            intendedRole = 'admin';
          }

          const newProfile: UserProfile = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            role: intendedRole,
            createdAt: serverTimestamp(),
          };

          await setDoc(docRef, newProfile);
          setProfile(newProfile as UserProfile);
          
          if (intendedRole === 'admin') setViewMode('admin');
          else if (['host', 'dj', 'instructor', 'media'].includes(intendedRole)) setViewMode('professional');
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, viewMode, setViewMode, refreshProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
