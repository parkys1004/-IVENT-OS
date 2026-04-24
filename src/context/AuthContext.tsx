import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export type UserRole = 'participant' | 'host' | 'admin' | 'dj' | 'instructor' | 'media' | 'banned';

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

  const fetchProfile = async (userId: string, currentUser?: User) => {
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
        console.log("Profile found:", data.display_name, "Role:", data.role);

        // Source of truth for email check should be the auth user if available
        const activeUser = currentUser || user;
        const userEmail = activeUser?.email?.toLowerCase() || data.email?.toLowerCase();
        
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
            }
          } else {
             // Already admin in DB, ensure viewMode is correct if not already set
             // This helps if they were already admin but viewMode defaulted to participant
             if (viewMode !== 'admin') {
               console.log("User is admin in DB but viewMode is not admin. Fixing...");
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
        
        // ALWAYS clear intendedRole once we have a profile (either found or updated)
        window.sessionStorage.removeItem('intendedRole'); 

        const mappedProfile: UserProfile = {
          uid: data.id,
          email: data.email,
          displayName: data.display_name,
          photoURL: data.photo_url,
          role: data.role as UserRole,
          isApproved: data.is_approved ?? true, // Default to true for better demo experience
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
        
        // Initial viewMode logic
        if (data.role === 'admin') setViewMode('admin');
        else if (['host', 'dj', 'instructor', 'media'].includes(data.role)) setViewMode('professional');
        else setViewMode('participant');
      } else {
        // No profile record found, but we have userId (potential new user)
        const activeUser = currentUser || user;
        if (activeUser) {
          console.log("No profile record found. Creating initial profile...");
          
          // Get intended role from sessionStorage (set by Login.tsx)
          const storedRole = window.sessionStorage.getItem('intendedRole');
          const intendedRole = (storedRole as UserRole) || 'participant';

          // Check if this specific email should be admin (case-insensitive)
          const isAdminEmail = activeUser.email?.toLowerCase() === 'aimaster1004@gmail.com';
          const assignedRole = isAdminEmail ? 'admin' : intendedRole;

          const newProfile = {
            id: userId,
            email: activeUser.email,
            display_name: activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'User',
            photo_url: activeUser.user_metadata?.avatar_url || '',
            role: assignedRole,
            is_approved: true, // Auto-approve all for demo
            points: 1000, // Welcome points
            created_at: new Date().toISOString()
          };

          const { data: createdData, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            if (createError.code === '23505') {
              // Unique constraint violation - likely another parallel call succeeded.
              // Just re-fetch the profile one last time.
              const { data: reFetch } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
              if (reFetch) {
                console.log("Parallel creation detected, profile found on re-fetch.");
                // Recursive call (one-time)
                fetchProfile(userId, currentUser);
                return;
              }
            }
            console.error("Failed to create profile:", createError);
          } else if (createdData) {
            console.log("Profile created successfully:", createdData);
            window.sessionStorage.removeItem('intendedRole'); // ONLY clear if creation succeeded or exists
            
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
        } else {
          console.warn("User has no profile record and no user object available.");
        }
      }
    } catch (error) {
      console.error("Critical failure in fetchProfile:", error);
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
    <AuthContext.Provider value={{ user, profile, loading, viewMode, setViewMode, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
