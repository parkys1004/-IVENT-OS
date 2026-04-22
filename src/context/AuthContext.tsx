import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type UserRole = 'participant' | 'host' | 'admin' | 'dj' | 'instructor' | 'media';

export type ViewMode = 'admin' | 'professional' | 'participant';

export interface UserProfile {
  uid: string; // id maps to uid
  email: string;
  displayName?: string; // display_name maps to displayName
  photoURL?: string; // photo_url maps to photoURL
  role: UserRole;
  createdAt: string; // created_at maps to createdAt
  points?: number;
  followersCount?: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  viewMode: 'participant', 
  setViewMode: () => {}, 
  refreshProfile: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('participant');

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchProfile = async (userId: string) => {
    console.log("Fetching profile for user:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Supabase profile error:", error);
        throw error;
      }
      
      if (data) {
        console.log("Profile found:", data.display_name);
        const mappedProfile: UserProfile = {
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          photoURL: data.photo_url,
          role: data.role as UserRole,
          createdAt: data.created_at,
          points: data.points,
          followersCount: data.followers_count
        };
        setProfile(mappedProfile);
        
        // Initial viewMode logic
        if (data.role === 'admin') setViewMode('admin');
        else if (['host', 'dj', 'instructor', 'media'].includes(data.role)) setViewMode('professional');
        else setViewMode('participant');
      } else {
        console.warn("User has no profile record in 'profiles' table.");
      }
    } catch (error) {
      console.error("Critical failure in fetchProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    console.log("AuthProvider initialized, checking session...");
    
    // Safety timeout: If loading isn't finished in 5s, force it
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth loading exceeded 5s. Forcing resolution to avoid hang.");
          return false;
        }
        return prev;
      });
    }, 5000);

    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Session fetched:", session ? "User active" : "No session");
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error("getSession error:", err);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state change event:", _event);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, viewMode, setViewMode, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
