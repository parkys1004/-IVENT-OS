import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { DEFAULT_POINT_POLICIES } from '../lib/points';

// 기존 타입 정의 유지
export type UserRole = 'participant' | 'host' | 'admin' | 'dj' | 'instructor' | 'media' | 'banned' | 'unassigned';
export type ViewMode = 'admin' | 'professional' | 'participant';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: string;
  points?: number;
  followersCount?: number;
  shortBio?: string;
  description?: string;
  specialties?: string;
  career?: string;
  portfolioUrl?: string;
  portfolioImages?: string[];
  studioLocation?: string;
  phone?: string;
  gender?: 'male' | 'female';
  instagram_url?: string;
  facebook_url?: string;
  kakao_id?: string;
  preferences?: {
    genres?: string[];
    regions?: string[];
    roles?: string[];
    types?: string[];
    autoApplied?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => void;
  authError?: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  viewMode: 'participant', 
  setViewMode: () => {}, 
  authError: null,
  refreshProfile: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('participant');
  const [authError, setAuthError] = useState<string | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const fetchProfile = useCallback(async (userId: string, currentUser?: User) => {
    if (isFetchingRef.current) return;
    
    // Only skip if we already have a profile for this user and it's initialized
    if (lastFetchedUserId.current === userId && profile) {
      console.log("Profile already loaded for:", userId);
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    lastFetchedUserId.current = userId;

    console.log("Fetching profile for user:", userId);
    setAuthError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) { 
        setAuthError(error.message); 
        throw error; 
      }

      const activeUser = currentUser;
      const userEmail = activeUser?.email?.toLowerCase() || data?.email?.toLowerCase();
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
      
      if (data) {
        let updatedRole = data.role as UserRole;
        let updatedIsApproved = data.is_approved ?? true;

        if (userEmail === adminEmail && data.role !== 'admin') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin', is_approved: true })
            .eq('id', userId);
          if (!updateError) {
            updatedRole = 'admin';
            updatedIsApproved = true;
          }
        } else {
          const storedRole = window.sessionStorage.getItem('intendedRole');
          if (storedRole && storedRole !== data.role && data.role !== 'admin') {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: storedRole, is_approved: true })
              .eq('id', userId);
            if (!updateError) updatedRole = storedRole as UserRole;
          }
        }

        window.sessionStorage.removeItem('intendedRole');

        const mappedProfile: UserProfile = {
          uid: data.id, email: data.email,
          displayName: data.display_name, photoURL: data.photo_url,
          role: updatedRole, isApproved: updatedIsApproved,
          createdAt: data.created_at, points: data.points,
          followersCount: data.followers_count, shortBio: data.short_bio,
          description: data.description, specialties: data.specialties,
          career: data.career, portfolioUrl: data.portfolio_url,
          portfolioImages: data.portfolio_images, studioLocation: data.studio_location,
          phone: data.phone,
          gender: data.gender,
          instagram_url: data.instagram_url,
          facebook_url: data.facebook_url,
          kakao_id: data.kakao_id,
          preferences: data.preferences
        };
        
        setProfile(mappedProfile);

        // Standardize viewMode logic here
        setViewMode(prev => {
          if (updatedRole === 'admin') return 'admin';
          if (['host', 'dj', 'instructor', 'media'].includes(updatedRole)) return 'professional';
          if (updatedRole !== 'unassigned') return 'participant';
          return prev;
        });

      } else if (activeUser) {
        const storedRole = window.localStorage.getItem('intendedRole');
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
        const isAdminEmail = activeUser.email?.toLowerCase() === adminEmail;
        const assignedRole = isAdminEmail ? 'admin' : ((storedRole as UserRole) || 'unassigned');

        let signupPoints = DEFAULT_POINT_POLICIES.signup_reward;
        try {
          const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle();
          if (settingData?.value?.signup_reward !== undefined) {
            signupPoints = Number(settingData.value.signup_reward);
          }
        } catch(e) { console.error("Failed to load point policies:", e); }

        const newProfile = {
          id: userId, email: activeUser.email,
          display_name: activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'User',
          photo_url: activeUser.user_metadata?.avatar_url || '',
          role: assignedRole, points: signupPoints, is_approved: true
        };

        const { data: createdData, error: createError } = await supabase
          .from('profiles').insert(newProfile).select().maybeSingle();

        if (createError) {
          if (createError.code === '23505') {
            const { data: reFetch } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            if (reFetch) {
              setProfile({ 
                uid: reFetch.id, email: reFetch.email, displayName: reFetch.display_name,
                photoURL: reFetch.photo_url, role: reFetch.role as UserRole, isApproved: reFetch.is_approved,
                createdAt: reFetch.created_at, points: reFetch.points 
              });
              setViewMode(reFetch.role === 'admin' ? 'admin' : ['host','dj', 'instructor','media'].includes(reFetch.role) ? 'professional' : 'participant');
            }
          } else {
            setAuthError(`Creation failed: ${createError.message}`);
          }
        } else if (createdData) {
          window.sessionStorage.removeItem('intendedRole');
          if (signupPoints > 0) {
            await supabase.from('point_history').insert({
              user_id: createdData.id, amount: signupPoints, reason: '신규 가입을 축하합니다!'
            });
          }
          setProfile({ 
            uid: createdData.id, email: createdData.email,
            displayName: createdData.display_name, photoURL: createdData.photo_url,
            role: createdData.role as UserRole, isApproved: createdData.is_approved,
            createdAt: createdData.created_at, points: createdData.points 
          });
          setViewMode(assignedRole === 'admin' ? 'admin' : ['host','dj','instructor','media'].includes(assignedRole) ? 'professional' : 'participant');
        }
      }
    } catch (error: any) {
      console.error("Critical failure in fetchProfile:", error);
      setAuthError(error.message || "Unknown error occurred");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      // Force refresh by clearing lastFetchedUserId
      lastFetchedUserId.current = null;
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change event:", event, session?.user?.id);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        lastFetchedUserId.current = null;
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // If INITIAL_SESSION or SIGNED_IN, verify profile
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          fetchProfile(session.user.id, session.user);
        }
      } else {
        setUser(null);
        setProfile(null);
        lastFetchedUserId.current = null;
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);


  const contextValue = useMemo(() => ({
    user, profile, loading, viewMode, setViewMode, authError, refreshProfile, logout
  }), [user, profile, loading, viewMode, authError, refreshProfile, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
