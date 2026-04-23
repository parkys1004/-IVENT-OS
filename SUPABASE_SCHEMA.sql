-- 1. PROFILES (Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'host', 'admin', 'dj', 'instructor', 'media', 'banned')),
  photo_url TEXT,
  phone TEXT,
  points INTEGER DEFAULT 0,
  rank_percentile INTEGER DEFAULT 100,
  short_bio TEXT,
  description TEXT,
  specialties TEXT,
  career TEXT,
  portfolio_url TEXT,
  portfolio_images TEXT[],
  studio_location TEXT,
  followers_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 USER_FOLLOWERS
CREATE TABLE user_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- 2. EVENTS
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  category TEXT NOT NULL,
  location_name TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'cancelled', 'expired')),
  price INTEGER DEFAULT 0,
  max_attendees INTEGER DEFAULT 0,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  image_url TEXT,
  is_banner BOOLEAN DEFAULT false,
  is_lesson BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REGISTRATIONS
CREATE TABLE registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROMO BANNERS
CREATE TABLE promo_banners (
  id TEXT PRIMARY KEY, -- 'sidebar1', 'sidebar2' 등 식별자 사용
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '#',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SETTINGS
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) SETTINGS
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events Policies
CREATE POLICY "Published events are viewable by everyone." ON events FOR SELECT USING (status = 'published');
CREATE POLICY "Admins and Hosts can view all events." ON events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR auth.uid() = host_id
);
CREATE POLICY "Instructors/DJs can create events." ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'dj', 'admin'))
);
CREATE POLICY "Hosts and Admins can update events." ON events FOR UPDATE USING (
  auth.uid() = host_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Registrations Policies
CREATE POLICY "Users can view own registrations." ON registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can register for events." ON registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promo Banners & Settings
CREATE POLICY "Public can view active banners and settings." ON promo_banners FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Public can view settings." ON settings FOR SELECT USING (true);
CREATE POLICY "Only admins can modify banners and settings." ON promo_banners FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Only admins can modify settings." ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ==========================================
-- TRIGGERS FOR PROFILE CREATION
-- ==========================================

-- auth.users에 신규 가입 시 자동으로 public.profiles에 레코드 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, photo_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 6. COMMUNITY FEATURES
-- ==========================================

-- 6.1 COMMUNITY POSTS (자유/문의 게시판)
CREATE TABLE community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('free', 'inquiry')),
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6.1.5 COMMUNITY COMMENTS (게시판 댓글)
CREATE TABLE community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6.2 EVENT COMMENTS (행사 댓글)
CREATE TABLE event_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6.3 EVENT REVIEWS (행사 리뷰)
CREATE TABLE event_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6.4 EVENT PHOTOS (행사 후기/스튜디오 갤러리)
CREATE TABLE event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. POINT SYSTEM
CREATE TABLE point_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for Community Features
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;

-- ... (previous policies)

-- Point History Policies
CREATE POLICY "Users can view own point history." ON point_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only admins can insert/update point history." ON point_history FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Community Posts Policies
CREATE POLICY "Anyone can view community posts." ON community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts." ON community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update their own posts." ON community_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors and Admins can delete posts." ON community_posts FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Community Comments Policies
CREATE POLICY "Anyone can view community comments." ON community_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments." ON community_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors and Admins can delete comments." ON community_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Comments Policies
CREATE POLICY "Anyone can view event comments." ON event_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments." ON event_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors and Admins can delete comments." ON event_comments FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Reviews Policies
CREATE POLICY "Anyone can view event reviews." ON event_reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post reviews." ON event_reviews FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors and Admins can delete reviews." ON event_reviews FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Event Photos Policies
CREATE POLICY "Anyone can view event photos." ON event_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload photos." ON event_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authors and Admins can delete photos." ON event_photos FOR DELETE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
