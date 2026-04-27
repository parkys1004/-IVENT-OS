import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type UserRole = 'participant' | 'host' | 'admin' | 'dj' | 'instructor' | 'media' | 'banned' | 'unassigned';

export type ViewMode = 'admin' | 'professional' | 'participant';

export interface UserProfile {
  uid: string; // id maps to uid
  email: string;
  displayName?: string; // display_name maps to displayName
  photoURL?: string; // photo_url maps to photoURL
  role: UserRole;
  isApproved: boolean;
  createdAt: string; // created_at maps to createdAt
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
  setViewMode: (mode: ViewMode) => void;
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

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fetchProfile = async (userId: string, currentUser?: User) => {
    console.count("fetchProfile called");
    console.log("Fetching profile for user:", userId);
    setAuthError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Supabase profile error:", error);
        setAuthError(error.message);
        throw error;
      }
      
      const activeUser = currentUser || user;
      const userEmail = activeUser?.email?.toLowerCase() || data?.email?.toLowerCase();

      if (data) {
        console.log("Profile found:", data.display_name, "Role:", data.role);

        // Auto-promote admin email (case-insensitive)
        if (userEmail === 'aimaster1004@gmail.com') {
          if (data.role !== 'admin') {
            console.log("CRITICAL: Auto-promoting aimaster1004@gmail.com to admin role...");
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: 'admin', is_approved: true })
              .eq('id', userId);
            
            if (!updateError) {
              console.log("Promotion successful!");
              data.role = 'admin';
              data.is_approved = true;
              setViewMode('admin');
            } else {
              console.error("Promotion failed:", updateError);
              setAuthError(`Promotion failed: ${updateError.message}`);
            }
          } else {
             if (viewMode !== 'admin') {
               setViewMode('admin');
             }
          }
        } else {
          // If the user specifically requested a different role during login/signup, update it
          const storedRole = window.sessionStorage.getItem('intendedRole');
          if (storedRole && storedRole !== data.role && data.role !== 'admin') {
             console.log(`Updating user role from ${data.role} to ${storedRole} as requested...`);
             const { error: updateError } = await supabase
               .from('profiles')
               .update({ role: storedRole, is_approved: true })
               .eq('id', userId);
             if (!updateError) {
               data.role = storedRole;
             }
          }
        }
        
        window.sessionStorage.removeItem('intendedRole'); 

        const mappedProfile: UserProfile = {
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          photoURL: data.photo_url,
          role: data.role as UserRole,
          isApproved: data.is_approved ?? true,
          createdAt: data.created_at,
          points: data.points,
          followersCount: data.followers_count,
          shortBio: data.short_bio,
          description: data.description,
          specialties: data.specialties,
          career: data.career,
          portfolioUrl: data.portfolio_url,
          portfolioImages: data.portfolio_images,
          studioLocation: data.studio_location,
          phone: data.phone
        };
        setProfile(mappedProfile);
        
        if (data.role === 'admin') {
          setViewMode('admin');
        } else if (['host', 'dj', 'instructor', 'media'].includes(data.role)) {
          setViewMode('professional');
        } else if (data.role !== 'unassigned') {
          setViewMode('participant');
        }
        // If unassigned, we don't set a default viewMode here; OnboardingModal handles it
      } else {
        if (activeUser) {
          console.log("No profile record found. Creating initial profile...");
          
          const storedRole = window.sessionStorage.getItem('intendedRole');
          const intendedRole = (storedRole as UserRole) || 'unassigned';
          const isAdminEmail = activeUser.email?.toLowerCase() === 'aimaster1004@gmail.com';
          const assignedRole = isAdminEmail ? 'admin' : intendedRole;

          let signupPoints = 1000;
          try {
            const { data: settingData } = await supabase.from('settings').select('value').eq('key', 'point_policies').maybeSingle();
            if (settingData?.value?.signup_reward !== undefined) {
               signupPoints = Number(settingData.value.signup_reward);
            }
          } catch(e) {
            console.error("Failed to load point policies for signup:", e);
          }

          const newProfile = {
            id: userId,
            email: activeUser.email,
            display_name: activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'User',
            photo_url: activeUser.user_metadata?.avatar_url || '',
            role: assignedRole,
            points: signupPoints,
            is_approved: true
          };

          console.log("Attempting to insert profile:", newProfile);
          const { data: createdData, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            console.error("Full createError object:", JSON.stringify(createError, null, 2));                
            setAuthError(`Creation failed: ${createError.message}`);
            if (createError.code === '23505') {
              const { data: reFetch } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
              if (reFetch) {
                fetchProfile(userId, currentUser);
                return;
              }
            }
            console.error("Failed to create profile:", createError);
            
            // EMERGENCY FALLBACK if creation completely fails
            setProfile({
              uid: userId,
              email: activeUser.email || '',
              displayName: activeUser.user_metadata?.full_name || 'Fallback User',
              photoURL: activeUser.user_metadata?.avatar_url || '',
              role: assignedRole,
              isApproved: true,
              createdAt: new Date().toISOString(),
              points: signupPoints
            });
            if (assignedRole === 'admin') setViewMode('admin');
          } else if (createdData) {
            console.log("Profile created successfully:", createdData);
            window.sessionStorage.removeItem('intendedRole');

            // Log initial point grant
            if (signupPoints > 0) {
              await supabase.from('point_history').insert({
                user_id: createdData.id,
                amount: signupPoints,
                reason: '신규 가입을 축하합니다!'
              });
            }
            
            const mappedCreatedProfile: UserProfile = {
              uid: createdData.id,
              email: createdData.email,
              displayName: createdData.display_name,
              photoURL: createdData.photo_url,
              role: createdData.role as UserRole,
              isApproved: createdData.is_approved,
              createdAt: createdData.created_at,
              points: createdData.points
            };
            setProfile(mappedCreatedProfile);
            
            if (createdData.role === 'admin') setViewMode('admin');
            else if (['host', 'dj', 'instructor', 'media'].includes(createdData.role)) setViewMode('professional');
            else setViewMode('participant');
          }
        }
      }
    } catch (error: any) {
      console.error("Critical failure in fetchProfile:", error);
      setAuthError(error.message || "Unknown error occurred");
      
      // EMERGENCY FALLBACK for critical failure
      if (currentUser || user) {
        const activeUser = currentUser || user;
        if (activeUser) {
           const isAdminEmail = activeUser.email?.toLowerCase() === 'aimaster1004@gmail.com';
           setProfile({
              uid: userId,
              email: activeUser.email || '',
              displayName: activeUser.user_metadata?.full_name || 'Fallback User',
              photoURL: activeUser.user_metadata?.avatar_url || '',
              role: isAdminEmail ? 'admin' : 'participant',
              isApproved: true,
              createdAt: new Date().toISOString(),
              points: 1000
           });
           if (isAdminEmail) setViewMode('admin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id, user);
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
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch(err => {
      console.error("getSession error:", err);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state change event:", _event);
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user);
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, viewMode, setViewMode, authError, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
