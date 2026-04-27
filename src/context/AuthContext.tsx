import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

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
  
  const isFetchingRef = useRef(false);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const fetchProfile = useCallback(async (userId: string, currentUser?: User) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    console.log("Fetching profile for user:", userId);
    setAuthError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) { setAuthError(error.message); throw error; }

      const activeUser = currentUser;
      const userEmail = activeUser?.email?.toLowerCase() || data?.email?.toLowerCase();

      if (data) {
        if (userEmail === 'aimaster1004@gmail.com' && data.role !== 'admin') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin', is_approved: true })
            .eq('id', userId);
          if (!updateError) {
            data.role = 'admin';
            data.is_approved = true;
          }
        } else {
          const storedRole = window.sessionStorage.getItem('intendedRole');
          if (storedRole && storedRole !== data.role && data.role !== 'admin') {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: storedRole, is_approved: true })
              .eq('id', userId);
            if (!updateError) data.role = storedRole;
          }
        }

        window.sessionStorage.removeItem('intendedRole');

        const mappedProfile: UserProfile = {
          uid: data.id, email: data.email,
          displayName: data.display_name, photoURL: data.photo_url,
          role: data.role as UserRole, isApproved: data.is_approved ?? true,
          createdAt: data.created_at, points: data.points,
          followersCount: data.followers_count, shortBio: data.short_bio,
          description: data.description, specialties: data.specialties,
          career: data.career, portfolioUrl: data.portfolio_url,
          portfolioImages: data.portfolio_images, studioLocation: data.studio_location,
          phone: data.phone
        };
        setProfile(mappedProfile);

        setViewMode(prev => {
          if (data.role === 'admin') return 'admin';
          if (['host', 'dj', 'instructor', 'media'].includes(data.role)) return 'professional';
          if (data.role !== 'unassigned') return 'participant';
          return prev;
        });

      } else if (activeUser) {
        const storedRole = window.sessionStorage.getItem('intendedRole');
        const isAdminEmail = activeUser.email?.toLowerCase() === 'aimaster1004@gmail.com';
        const assignedRole = isAdminEmail ? 'admin' : ((storedRole as UserRole) || 'unassigned');

        let signupPoints = 1000;
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
              setProfile({ uid: reFetch.id, email: reFetch.email, displayName: reFetch.display_name,
                photoURL: reFetch.photo_url, role: reFetch.role, isApproved: reFetch.is_approved,
                createdAt: reFetch.created_at, points: reFetch.points });
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
          setProfile({ uid: createdData.id, email: createdData.email,
            displayName: createdData.display_name, photoURL: createdData.photo_url,
            role: createdData.role, isApproved: createdData.is_approved,
            createdAt: createdData.created_at, points: createdData.points });
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
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user);
  }, [user, fetchProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(prev => prev ? false : prev);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change event:", event);

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) setUser(session.user);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        // Add a slight delay to allow auth initialization to finish and release any locks
        setTimeout(() => fetchProfile(session.user.id, session.user), 100);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
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
