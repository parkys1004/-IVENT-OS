import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { 
  Music, GraduationCap, Camera, CalendarDays, Star, Settings, PlayCircle, Users, 
  ImageIcon as ImageIcon, Briefcase, ChevronRight, CheckCircle2, XCircle, Clock, 
  Plus, BarChart3, CreditCard, PenTool, User, X, BookOpen, MessageSquare, 
  Layout, Headphones, Video, Layers, ListMusic, UserCheck, Coins, Bot
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { supabase } from '../supabase';
import { uploadImageToStorage } from '../lib/storage';

type MenuKey = 'activities' | 'events' | 'profile' | 'participants' | 'community' | 'students' | 'curriculum' | 'playlist' | 'bookings' | 'equipment' | 'gallery' | 'scanner';
type TabKey = string;

export default function ProfessionalDashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [activeMenu, setActiveMenu] = useState<MenuKey>('activities');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [followers, setFollowers] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  const roleMenus: Record<string, { key: MenuKey, label: string, icon: React.ReactNode }[]> = {
    host: [
      { key: 'activities', label: '활동 스케줄', icon: <CalendarDays className="w-5 h-5" /> },
      { key: 'events', label: '내 행사 관리', icon: <Star className="w-5 h-5" /> },
      { key: 'participants', label: '참가자 명단', icon: <Users className="w-5 h-5" /> },
      { key: 'scanner', label: '입장 스캐너', icon: <Camera className="w-5 h-5" /> },
      { key: 'community', label: '커뮤니티 소통', icon: <MessageSquare className="w-5 h-5" /> },
    ],
    instructor: [
      { key: 'activities', label: '강습 스케줄', icon: <CalendarDays className="w-5 h-5" /> },
      { key: 'events', label: '강습 모집 관리', icon: <GraduationCap className="w-5 h-5" /> },
      { key: 'students', label: '수강생 관리', icon: <UserCheck className="w-5 h-5" /> },
      { key: 'curriculum', label: '커리큘럼/자료', icon: <BookOpen className="w-5 h-5" /> },
    ],
    dj: [
      { key: 'activities', label: '공연 스케줄', icon: <CalendarDays className="w-5 h-5" /> },
      { key: 'playlist', label: '플레이리스트', icon: <Music className="w-5 h-5" /> },
      { key: 'bookings', label: '섭외 요청', icon: <Clock className="w-5 h-5" /> },
      { key: 'equipment', label: '장비 설정', icon: <Headphones className="w-5 h-5" /> },
    ],
    media: [
      { key: 'activities', label: '촬영 스케줄', icon: <CalendarDays className="w-5 h-5" /> },
      { key: 'events', label: '프로젝트 관리', icon: <Briefcase className="w-5 h-5" /> },
      { key: 'gallery', label: '갤러리 관리', icon: <Camera className="w-5 h-5" /> },
      { key: 'equipment', label: '촬영 장비', icon: <Video className="w-5 h-5" /> },
    ],
    admin: [
      { key: 'activities', label: '시스템 현황', icon: <BarChart3 className="w-5 h-5" /> },
      { key: 'events', label: '전체 행사 관리', icon: <Star className="w-5 h-5" /> },
    ],
    participant: [] // Should not really be here but for safety
  };

  const currentRoleMenus = [...(roleMenus[profile?.role || 'host'] || roleMenus.host), 
    { key: 'profile', label: '프로필 설정', icon: <Settings className="w-5 h-5" /> }
  ];
  
  // Image handling from EditEvent.tsx logic
  const portfolioFileInputRef = useRef<HTMLInputElement>(null);
  const profilePictureInputRef = useRef<HTMLInputElement>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    try {
      setIsSaving(true);
      const newImages = await Promise.all(fileArray.map(f => uploadImageToStorage(f, 'events'))); // Using events bucket for portfolio images conceptually, or images bucket
      setPortfolioImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
      if (portfolioFileInputRef.current) portfolioFileInputRef.current.value = '';
    }
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  // Profile management state
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Specialized data state
  const [specializedData, setSpecializedData] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    displayName: '',
    shortBio: '',
    description: '',
    specialties: '',
    career: '',
    portfolioUrl: '',
    studioLocation: '',
    photoURL: '',
    gender: '', // 추가된 필드
    facebookUrl: '', // 추가된 필드
    youtubeUrl: '', // 추가된 필드
    // Specialized fields
    experienceYears: 0,
    curriculumLink: '',
    musicStyle: '',
    mainEquipment: '',
    soundcloudUrl: '',
    mixcloudUrl: '',
    creatorCategory: 'both' as 'photo' | 'video' | 'both',
    equipmentList: '',
    instagramUrl: '',
  });

  const isInitializedRef = useRef(false);
  useEffect(() => {
    const fetchSpecializedData = async () => {
      if (!user || !profile) return;
      
      let tableName = '';
      if (profile.role === 'instructor') tableName = 'instructors';
      else if (profile.role === 'dj') tableName = 'djs';
      else if (profile.role === 'media') tableName = 'creators';
      
      if (!tableName) return;

      const { data } = await supabase.from(tableName).select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setSpecializedData(data);
        setProfileForm(prev => ({
          ...prev,
          experienceYears: data.experience_years || 0,
          curriculumLink: data.curriculum_link || '',
          musicStyle: (data.music_style || []).join(', '),
          mainEquipment: data.main_equipment || '',
          soundcloudUrl: data.soundcloud_url || '',
          mixcloudUrl: data.mixcloud_url || '',
          creatorCategory: data.category || 'both',
          equipmentList: data.equipment_list || '',
          instagramUrl: data.instagram_url || '',
        }));
      }
    };

    if (profile && !isInitializedRef.current) {
      setProfileForm(prev => ({
        ...prev,
        displayName: profile.displayName || '',
        shortBio: (profile as any).shortBio || '',
        description: (profile as any).description || '',
        specialties: (profile as any).specialties || '',
        career: (profile as any).career || '',
        portfolioUrl: (profile as any).portfolioUrl || '',
        studioLocation: (profile as any).studioLocation || '',
        photoURL: profile.photoURL || '',
        gender: (profile as any).gender || '',
        facebookUrl: (profile as any).facebookUrl || '',
        youtubeUrl: (profile as any).youtubeUrl || '',
      }));
      setPortfolioImages(profile.portfolioImages || []);
      isInitializedRef.current = true;
      fetchSpecializedData();
    }
  }, [profile, user]);

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsSaving(true);
      const dataUrl = await uploadImageToStorage(file, 'profiles');
      setProfileForm(prev => ({ ...prev, photoURL: dataUrl }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setIsSaving(true);
    setSaveMessage('');
    try {
      // 1. Update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: profileForm.displayName,
          short_bio: profileForm.shortBio,
          description: profileForm.description,
          specialties: profileForm.specialties,
          career: profileForm.career,
          portfolio_url: profileForm.portfolioUrl,
          portfolio_images: portfolioImages,
          studio_location: profileForm.studioLocation,
          photo_url: profileForm.photoURL,
          gender: profileForm.gender,
          facebook_url: profileForm.facebookUrl,
          youtube_url: profileForm.youtubeUrl,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      // 2. Update specialized table
      let specializedTable = '';
      let specializedPayload: any = {};

      if (profile.role === 'instructor') {
        specializedTable = 'instructors';
        specializedPayload = {
          id: user.id,
          specialty_genres: profileForm.specialties.split(',').map(s => s.trim()).filter(s => s),
          experience_years: Number(profileForm.experienceYears),
          bio: profileForm.description,
          curriculum_link: profileForm.curriculumLink,
          updated_at: new Date().toISOString()
        };
      } else if (profile.role === 'dj') {
        specializedTable = 'djs';
        specializedPayload = {
          id: user.id,
          music_style: profileForm.musicStyle.split(',').map(s => s.trim()).filter(s => s),
          main_equipment: profileForm.mainEquipment,
          soundcloud_url: profileForm.soundcloudUrl,
          mixcloud_url: profileForm.mixcloudUrl,
          updated_at: new Date().toISOString()
        };
      } else if (profile.role === 'media') {
        specializedTable = 'creators';
        specializedPayload = {
          id: user.id,
          category: profileForm.creatorCategory,
          equipment_list: profileForm.equipmentList,
          portfolio_url: profileForm.portfolioUrl,
          instagram_url: profileForm.instagramUrl,
          updated_at: new Date().toISOString()
        };
      }

      if (specializedTable) {
        const { error: specError } = await supabase
          .from(specializedTable)
          .upsert(specializedPayload);
        
        if (specError) {
          console.warn(`Error updating ${specializedTable}:`, specError);
        }
      }

      await refreshProfile();
      setSaveMessage('프로필이 성공적으로 저장되었습니다.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  useEffect(() => {
    if (activeMenu === 'profile' && activeTab === 'reviews' && user) {
      const fetchFollowers = async () => {
        setLoadingFollowers(true);
        try {
          const { data, error } = await supabase
            .from('user_followers')
            .select(`
              id,
              follower:profiles!follower_id (
                id,
                display_name,
                photo_url,
                role
              )
            `)
            .eq('following_id', user.id);
          
          if (error) throw error;
          
          const followerData = data?.map((item: any) => ({
            id: item.follower?.id,
            displayName: item.follower?.display_name || '알 수 없는 사용자',
            photoURL: item.follower?.photo_url,
            role: item.follower?.role
          })) || [];
          
          setFollowers(followerData);
        } catch (error) {
          console.error("Error fetching followers:", error);
        } finally {
          setLoadingFollowers(false);
        }
      };
      fetchFollowers();
    }
  }, [activeMenu, activeTab, user]);
  
  // Handlers
  const handleMenuClick = (menu: MenuKey) => {
    if (menu === 'scanner') {
      navigate('/scan-tickets');
      return;
    }
    setActiveMenu(menu);
    setActiveTab('all');
  };

  // --- Sub-contents ---

  const renderActivitiesContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      {!profile?.isApproved && profile?.role !== 'admin' && profile?.role !== 'participant' && (
        <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="font-black text-orange-900 dark:text-orange-300">전문가 승인 대기 중</h4>
            <p className="text-xs text-orange-700 dark:text-orange-400/80 font-bold leading-relaxed">
              현재 관리자가 귀하의 프로필을 검토하고 있습니다. 승인이 완료되면 강습 및 행사를 등록하실 수 있습니다. 
              프로필 정보를 상세히 입력할수록 승인이 빨라집니다!
            </p>
          </div>
        </div>
      )}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          예정된 스케줄
        </button>
        <button onClick={() => setActiveTab('pending')} className={clsx("px-4 py-3 font-bold transition-colors flex items-center gap-2", activeTab === 'pending' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          수락 대기
          <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
        </button>
        <button onClick={() => setActiveTab('completed')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'completed' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          완료/취소
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">이번 달 확정 스케줄</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">5<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">진행 완료</div>
          <div className="text-3xl font-black text-slate-800 dark:text-white">12<span className="text-sm font-normal text-slate-500 ml-1">건</span></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm text-indigo-600 dark:text-indigo-400">
          <div className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-2">팔로워</div>
          <div className="text-3xl font-black">{profile?.followersCount || 0}<span className="text-sm font-normal text-slate-500 ml-1">명</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 mx-auto w-full rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1 flex flex-col p-12 text-center text-slate-500 items-center justify-center min-h-[300px]">
          {activeTab === 'pending' ? (
            <>
              <Clock className="w-12 h-12 mb-4 text-orange-300" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">대기 중인 섭외 요청</h3>
              <p>현재 검토해야 할 섭외 요청이 3건 있습니다.</p>
              <button className="mt-4 px-6 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-colors">요청 확인하기</button>
            </>
          ) : (
            <>
              <CalendarDays className="w-12 h-12 mb-4 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">일정이 없습니다</h3>
              <p>다양한 행사에 지원하거나 포트폴리오를 업데이트 해보세요.</p>
            </>
          )}
      </div>
    </div>
  );

  const renderEventsContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          {profile?.role === 'instructor' ? '강습 등록 폼' : '행사 등록 폼'}
        </button>
        <button onClick={() => setActiveTab('past')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'past' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          {profile?.role === 'instructor' ? '이전 강습 내역' : '이전 등록 내역'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'all' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center py-20">
             <Plus className="w-16 h-16 text-indigo-200 dark:text-indigo-900 mb-6" />
             <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
               {profile?.role === 'instructor' ? '새로운 강습을 시작하시나요?' : '새로운 행사를 주최하시나요?'}
             </h3>
             <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
               {profile?.role === 'instructor' 
                 ? '커리큘럼부터 수강공지까지 쉽고 편하게 새로운 강습을 모집하세요.'
                 : '기본 정보부터 포스터 등록까지 쉽고 편하게 새로운 댄스 행사를 개설하세요.'}
             </p>
            <button 
              onClick={() => {
                if (!profile?.isApproved && profile?.role !== 'admin') {
                  alert('전문가 승인이 완료된 후 이용 가능합니다.');
                  return;
                }
                navigate(profile?.role === 'instructor' ? '/create-lesson' : '/create');
              }} 
              className={clsx(
                "px-8 py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-lg",
                (!profile?.isApproved && profile?.role !== 'admin') 
                  ? "bg-slate-400 cursor-not-allowed shadow-none" 
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
              )}
            >
              <Plus className="w-5 h-5" /> {profile?.role === 'instructor' ? '강습 등록 시작하기' : '행사 등록 시작하기'}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center py-20">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">
               {profile?.role === 'instructor' ? '이전에 등록했던 강습이 없습니다.' : '이전에 등록했던 행사가 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderProfileContent = () => (
    <div className="space-y-6 flex flex-col h-full overflow-y-auto no-scrollbar pb-20">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button onClick={() => setActiveTab('all')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'all' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          프로필 수정
        </button>
        <button onClick={() => setActiveTab('portfolio')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'portfolio' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          포트폴리오 관리
        </button>
        <button onClick={() => setActiveTab('reviews')} className={clsx("px-4 py-3 font-bold transition-colors", activeTab === 'reviews' ? "text-slate-800 dark:text-white border-b-2 border-slate-800 dark:border-white" : "text-slate-400 hover:text-slate-600")}>
          팬/리뷰
        </button>
      </div>

      <div className="flex-1">
        {activeTab === 'portfolio' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col h-full min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">내 포트폴리오 (사진)</h3>
              <button 
                onClick={() => portfolioFileInputRef.current?.click()}
                className="flex items-center gap-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-200 transition-colors"
              >
                <Plus className="w-4 h-4" /> 포트폴리오 추가
              </button>
              <input 
                type="file" 
                ref={portfolioFileInputRef} 
                onChange={handlePortfolioUpload} 
                multiple 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            {portfolioImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2">
                {portfolioImages.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100 dark:border-slate-800">
                    <img src={url} alt={`portfolio-${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => removePortfolioImage(idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-3">
                <ImageIcon className="w-10 h-10 opacity-20" />
                <p>등록된 포트폴리오 영상/사진이 없습니다.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 flex flex-col h-full min-h-[400px]">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">팬 (팔로워)</h3>
            {loadingFollowers ? (
              <div className="flex-1 flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : followers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {followers.map((follower) => (
                  <div key={follower.id} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-50 dark:border-indigo-900/20">
                      {follower.photoURL ? (
                        <img src={follower.photoURL} alt={follower.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-indigo-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white truncate text-sm">{follower.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{follower.role || 'Participant'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p>아직 팔로워가 없습니다.<br />활발한 활동을 통해 팬을 만들어보세요!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="max-w-xl">
               <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6">
                 {profile?.role === 'instructor' ? '강사 프로필 설정' : 
                  profile?.role === 'dj' ? 'DJ 프로필 설정' : 
                  profile?.role === 'media' ? '포토/영상 전문가 프로필 설정' : '프로필 설정'}
               </h3>
               
               <form onSubmit={handleProfileSubmit} className="space-y-4">
                 <div className="flex flex-col items-center gap-4 mb-6">
                   <div className="relative group/avatar cursor-pointer" onClick={() => profilePictureInputRef.current?.click()}>
                     <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl group-hover/avatar:opacity-80 transition-opacity">
                       {profileForm.photoURL ? (
                         <img src={profileForm.photoURL} alt="Profile" className="w-full h-full object-cover" />
                       ) : (
                         <User className="w-12 h-12 text-slate-300" />
                       )}
                     </div>
                     <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white drop-shadow-md" />
                     </div>
                     <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                       <Plus className="w-4 h-4" />
                     </div>
                   </div>
                   <input 
                     type="file" 
                     ref={profilePictureInputRef} 
                     onChange={handleProfilePictureChange} 
                     accept="image/*" 
                     className="hidden" 
                   />
                   <p className="text-[11px] font-bold text-slate-400">클릭하여 프로필 사진 변경</p>
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">활동명 (이름)</label>
                   <input 
                     type="text" 
                     name="displayName"
                     value={profileForm.displayName}
                     onChange={handleFormChange}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                     placeholder="활동명을 입력하세요" 
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">한 줄 소개</label>
                   <input 
                     type="text" 
                     name="shortBio"
                     value={profileForm.shortBio}
                     onChange={handleFormChange}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                     placeholder={profile?.role === 'instructor' ? '예: 10년 경력의 살사 전문 강사입니다' : '한 줄 프로필을 입력하세요'} 
                   />
                 </div>

                  {profile?.role === 'instructor' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">주요 레슨 장르 / 커리큘럼</label>
                        <input 
                           type="text" 
                           name="specialties"
                           value={profileForm.specialties}
                           onChange={handleFormChange}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                           placeholder="예: 살사 온1, 바차타 센슈얼" 
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">강습 경력 (년)</label>
                          <input 
                            type="number" 
                            name="experienceYears"
                            value={profileForm.experienceYears}
                            onChange={handleFormChange}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                            placeholder="숫자만 입력" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">커리큘럼 / 홍보 링크</label>
                          <input 
                            type="url" 
                            name="curriculumLink"
                            value={profileForm.curriculumLink}
                            onChange={handleFormChange}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                            placeholder="https://..." 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {profile?.role === 'dj' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">주요 플레이 장르 (Music Styles)</label>
                        <input 
                           type="text" 
                           name="musicStyle"
                           value={profileForm.musicStyle}
                           onChange={handleFormChange}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                           placeholder="예: Vinyl Salsa, Mambo, Guaguanco" 
                        />
                        <p className="text-[11px] text-slate-400 mt-1">쉼표(,)로 구분하여 입력하세요.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">보유 및 선호 장비 (Main Equipment)</label>
                        <input 
                           type="text" 
                           name="mainEquipment"
                           value={profileForm.mainEquipment}
                           onChange={handleFormChange}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                           placeholder="예: Technics SL-1200MK3" 
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SoundCloud URL</label>
                          <input 
                            type="url" 
                            name="soundcloudUrl"
                            value={profileForm.soundcloudUrl}
                            onChange={handleFormChange}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white text-xs" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">MixCloud URL</label>
                          <input 
                            type="url" 
                            name="mixcloudUrl"
                            value={profileForm.mixcloudUrl}
                            onChange={handleFormChange}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {profile?.role === 'media' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">전문 분야</label>
                        <select 
                          name="creatorCategory"
                          value={profileForm.creatorCategory}
                          onChange={(e: any) => handleFormChange(e)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white"
                        >
                          <option value="photo">사진 (Photo)</option>
                          <option value="video">영상 (Video)</option>
                          <option value="both">사진 & 영상 (Both)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">사용 장비 (Equipment List)</label>
                        <textarea 
                           name="equipmentList"
                           value={profileForm.equipmentList}
                           onChange={handleFormChange}
                           className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white text-sm" 
                           placeholder="주요 촬영 장비를 입력하세요." 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Instagram URL</label>
                        <input 
                          type="url" 
                          name="instagramUrl"
                          value={profileForm.instagramUrl}
                          onChange={handleFormChange}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                        />
                      </div>
                    </div>
                  )}

                 {(profile?.role === 'media' || profile?.role === 'dj' || profile?.role === 'instructor') && (
                   <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">포트폴리오 / SNS 링크</label>
                     <input 
                       type="url" 
                       name="portfolioUrl"
                       value={profileForm.portfolioUrl}
                       onChange={handleFormChange}
                       className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 text-slate-800 dark:text-white" 
                       placeholder="https://instagram.com/your-id" 
                     />
                   </div>
                 )}

                 <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">상세 경력 및 자기소개</label>
                   <textarea 
                     name="description"
                     value={profileForm.description}
                     onChange={handleFormChange}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 min-h-[150px] text-slate-800 dark:text-white" 
                     placeholder="회원님들에게 보여질 상세한 프로필 정보를 입력해주세요."
                   ></textarea>
                 </div>

                 <div className="mt-4">
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">주요 경력 하이라이트 (Highlights)</label>
                   <textarea 
                     name="career"
                     value={profileForm.career}
                     onChange={handleFormChange}
                     className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 border rounded-xl px-4 py-3 min-h-[120px] text-slate-800 dark:text-white" 
                     placeholder="주요 수상 경력, 활동 내역 등을 입력하세요."
                   ></textarea>
                 </div>

                 {isSaving && (
                   <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                     <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                     저장 중...
                   </div>
                 )}

                 {saveMessage && (
                   <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                     {saveMessage}
                   </div>
                 )}
                 
                 <button 
                   type="submit"
                   disabled={isSaving}
                   className="mt-4 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 w-full sm:w-auto shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                 >
                   프로필 저장하기
                 </button>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderRoleSpecificContent = () => {
    const commonStyle = "bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center text-center min-h-[500px]";
    
    switch (activeMenu) {
      case 'participants': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
            <Users className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">참가자 통합 관리</h3>
          <p className="text-slate-500 max-w-sm mb-8">주최하신 행사의 모든 신청자를 한눈에 확인하고,<br />QR 체크인 및 참가 확정을 관리할 수 있습니다.</p>
          <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20">참가자 목록 불러오기</button>
        </div>
      );
      case 'community': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">행사 커뮤니티 소통</h3>
          <p className="text-slate-500 max-w-sm mb-8">게시판을 통해 공지사항을 전달하고,<br />참가자들의 질문에 실시간으로 답변해 보세요.</p>
          <button className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">새 공지사항 작성</button>
        </div>
      );
      case 'students': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400">
            <UserCheck className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">수강생 진도 관리</h3>
          <p className="text-slate-500 max-w-sm mb-8">강습별 수강생들의 출결과 진도를 기록하고,<br />개인별 피드백을 전달할 수 있는 공간입니다.</p>
          <button className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20">수강생 명단 보기</button>
        </div>
      );
      case 'curriculum': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">커리큘럼 및 자료함</h3>
          <p className="text-slate-500 max-w-sm mb-8">강습 영상, 음원, 교안 등 수강생들에게 공유할<br />소중한 교육 자료들을 체계적으로 관리하세요.</p>
          <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20">자료 업로드</button>
        </div>
      );
      case 'playlist': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
            <Music className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">스마트 플레이리스트</h3>
          <p className="text-slate-500 max-w-sm mb-8">행사 장르에 맞는 셋리스트를 구성하고,<br />현장에서 바로 사용할 수 있도록 준비하세요.</p>
          <button className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20">플레이리스트 생성</button>
        </div>
      );
      case 'bookings': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-6 text-rose-600 dark:text-rose-400">
            <Clock className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">신규 섭외 요청</h3>
          <p className="text-slate-500 max-w-sm mb-8">주최자들로부터 들어온 새로운 섭외 제안을 확인하고<br />일정을 조율하거나 계약을 확정하세요.</p>
          <button className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20">요청 목록 확인</button>
        </div>
      );
      case 'equipment': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600 dark:text-slate-400">
            <Settings className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">전문 장비 설정</h3>
          <p className="text-slate-500 max-w-sm mb-8">최상의 퍼포먼스를 위해 필요한 장비 사양을 기록하고,<br />주최측에 전달할 기술 요구사항(Rider)을 관리하세요.</p>
          <button className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">라이더 작성하기</button>
        </div>
      );
      case 'gallery': return (
        <div className={commonStyle}>
          <div className="w-20 h-20 bg-cyan-100 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-6 text-cyan-600 dark:text-cyan-400">
            <ImageIcon className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-4">미디어 갤러리 관리</h3>
          <p className="text-slate-500 max-w-sm mb-8">촬영된 고화질 결과물을 업로드하고 카테고리별로 분류하여<br />의뢰인에게 전달하거나 포트폴리오로 활용하세요.</p>
          <button className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-600/20">갤러리 생성</button>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden glass-panel h-full w-full min-h-0 transition-colors">
      
      {/* LNB (Left Navigation Bar) */}
      <div className="w-64 bg-white/20 dark:bg-slate-900/20 border-r border-slate-200/30 dark:border-slate-800/20 backdrop-blur-3xl h-full flex flex-col shadow-sm z-10 shrink-0 hidden lg:flex">
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="bg-indigo-600 rounded-2xl p-6 shadow-lg shadow-indigo-600/20 text-white mb-8">
            <p className="font-bold text-indigo-100 text-[10px] uppercase tracking-widest mb-2">
              {profile?.role === 'dj' ? 'Professional DJ' : 
               profile?.role === 'instructor' ? 'Professional Instructor' : 
               profile?.role === 'media' ? 'Media Expert' : 'Professional Host'}
            </p>
            <p className="text-indigo-200 text-xs font-medium mb-1 opacity-80">멋진 행사를 기대할게요!</p>
            <p className="font-black text-xl leading-tight truncate">{profile?.displayName || '전문가'}님</p>
          </div>

          <nav className="space-y-1 pb-4">
            {currentRoleMenus.map((item) => (
              <button 
                key={item.key}
                onClick={() => handleMenuClick(item.key as MenuKey)}
                className={clsx(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-sm group/menu", 
                  activeMenu === item.key 
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={clsx("transition-transform group-hover/menu:scale-110", activeMenu === item.key && "text-indigo-600 dark:text-indigo-400")}>
                    {item.icon}
                  </span>
                  {item.label}
                </div>
                {activeMenu === item.key && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}

            <div className="my-4 h-px bg-slate-100/50 dark:bg-slate-800/50 mx-2"></div>
            
            <Link 
              to="/points"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white group"
            >
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-amber-500 transition-transform group-hover:scale-110" />
                포인트 충전
              </div>
            </Link>
            <Link 
              to="/ai-settings"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white group"
            >
              <div className="flex items-center gap-3">
                <Bot className="w-5 h-5 text-indigo-500 transition-transform group-hover:scale-110" />
                AI API 설정
              </div>
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 lg:p-10 min-h-0">
        
        {/* Mobile Nav */}
        <div className="lg:hidden w-full mb-6 max-w-full overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
           {currentRoleMenus.map((item) => (
              <button 
                key={item.key}
                onClick={() => handleMenuClick(item.key as MenuKey)}
                className={clsx(
                  "whitespace-nowrap px-4 py-2 rounded-xl font-black text-sm border transition-all shadow-sm", 
                  activeMenu === item.key 
                    ? "bg-slate-800 dark:bg-indigo-400 text-white dark:text-slate-900 border-slate-800 dark:border-indigo-400 scale-105" 
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                )}
              >
                {item.label.split(' ')[0]}
              </button>
           ))}
        </div>

        {/* Breadcrumbs (Desktop) */}
        <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 font-bold mb-8 tracking-tight shrink-0">
          <span className="capitalize">{profile?.role || 'Professional'}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 dark:text-white capitalize text-lg font-black tracking-tighter">
            {currentRoleMenus.find(m => m.key === activeMenu)?.label || 'Dashboard'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col h-full min-h-0"
          >
            {activeMenu === 'activities' && renderActivitiesContent()}
            {activeMenu === 'events' && renderEventsContent()}
            {activeMenu === 'profile' && renderProfileContent()}
            {renderRoleSpecificContent()}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
