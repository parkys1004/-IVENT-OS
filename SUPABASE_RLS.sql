-- --------------------------------------------------------------------------------
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP SCRIPT
-- 
-- 이 스크립트를 Supabase SQL Editor에 복사하여 실행하시면,
-- 데이터베이스 보안(RLS)이 대폭 강화됩니다.
-- --------------------------------------------------------------------------------

-- 1. 모든 테이블 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_configs ENABLE ROW LEVEL SECURITY;

-- 2. 권한 검사를 위한 유틸리티 함수 생성 (SECURITY DEFINER)
-- 주의: 관리자 여부를 안전하게 확인하기 위한 함수입니다.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. PROFILES 및 회원 관련 테이블 정책
-- 누구나 조회 가능
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Instructors are viewable by everyone" ON instructors;
CREATE POLICY "Instructors are viewable by everyone" ON instructors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Djs are viewable by everyone" ON djs;
CREATE POLICY "Djs are viewable by everyone" ON djs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Creators are viewable by everyone" ON creators;
CREATE POLICY "Creators are viewable by everyone" ON creators FOR SELECT USING (true);

-- 자기 자신만 생성/수정 가능 OR 관리자는 모든 수정 가능
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can insert own instructor data" ON instructors;
CREATE POLICY "Users can insert own instructor data" ON instructors FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own instructor data" ON instructors;
CREATE POLICY "Users can update own instructor data" ON instructors FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own dj data" ON djs;
CREATE POLICY "Users can insert own dj data" ON djs FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own dj data" ON djs;
CREATE POLICY "Users can update own dj data" ON djs FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own creator data" ON creators;
CREATE POLICY "Users can insert own creator data" ON creators FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own creator data" ON creators;
CREATE POLICY "Users can update own creator data" ON creators FOR UPDATE USING (auth.uid() = id OR is_admin());


-- 4. PARTIES & LESSONS 정책 (조회: 모두 / 생성: 로그인 유저 / 수정: 본인(호스트) 또는 관리자)
DROP POLICY IF EXISTS "Parties are viewable by everyone" ON parties;
CREATE POLICY "Parties are viewable by everyone" ON parties FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert parties" ON parties;
CREATE POLICY "Authenticated users can insert parties" ON parties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Host or admin can update parties" ON parties;
CREATE POLICY "Host or admin can update parties" ON parties FOR UPDATE USING (auth.uid() = host_id OR is_admin());
DROP POLICY IF EXISTS "Host or admin can delete parties" ON parties;
CREATE POLICY "Host or admin can delete parties" ON parties FOR DELETE USING (auth.uid() = host_id OR is_admin());

DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON lessons;
CREATE POLICY "Lessons are viewable by everyone" ON lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert lessons" ON lessons;
CREATE POLICY "Authenticated users can insert lessons" ON lessons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Host or admin can update lessons" ON lessons;
CREATE POLICY "Host or admin can update lessons" ON lessons FOR UPDATE USING (auth.uid() = host_id OR is_admin());
DROP POLICY IF EXISTS "Host or admin can delete lessons" ON lessons;
CREATE POLICY "Host or admin can delete lessons" ON lessons FOR DELETE USING (auth.uid() = host_id OR is_admin());


-- 5. REGISTRATIONS (신청 내역)
-- 본인 신청 내역만 보거나 모두 볼 수 있도록. (대시보드를 위해 임시로 누구나 조회는 가능하게 허용하되, 생성/수정은 엄격히 제한)
DROP POLICY IF EXISTS "Registrations viewable by everyone" ON registrations;
CREATE POLICY "Registrations viewable by everyone" ON registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can register themselves" ON registrations;
CREATE POLICY "Users can register themselves" ON registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own registrations" ON registrations;
CREATE POLICY "Users can update own registrations" ON registrations FOR UPDATE USING (auth.uid() = user_id OR is_admin());


-- 6. 커뮤니티 및 댓글 정책
DROP POLICY IF EXISTS "Posts viewable by everyone" ON community_posts;
CREATE POLICY "Posts viewable by everyone" ON community_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can create posts" ON community_posts;
CREATE POLICY "Authenticated can create posts" ON community_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own posts" ON community_posts;
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own posts" ON community_posts;
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = author_id OR is_admin());

DROP POLICY IF EXISTS "Comments viewable by everyone" ON community_comments;
CREATE POLICY "Comments viewable by everyone" ON community_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can create comments" ON community_comments;
CREATE POLICY "Authenticated can create comments" ON community_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can update own comments" ON community_comments;
CREATE POLICY "Users can update own comments" ON community_comments FOR UPDATE USING (auth.uid() = author_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own comments" ON community_comments;
CREATE POLICY "Users can delete own comments" ON community_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

DROP POLICY IF EXISTS "Event comments viewable by everyone" ON event_comments;
CREATE POLICY "Event comments viewable by everyone" ON event_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can create event comments" ON event_comments;
CREATE POLICY "Authenticated can create event comments" ON event_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own event comments" ON event_comments;
CREATE POLICY "Users can delete own event comments" ON event_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

DROP POLICY IF EXISTS "Event reviews viewable by everyone" ON event_reviews;
CREATE POLICY "Event reviews viewable by everyone" ON event_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can create reviews" ON event_reviews;
CREATE POLICY "Authenticated can create reviews" ON event_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON event_reviews;
CREATE POLICY "Users can delete own reviews" ON event_reviews FOR DELETE USING (auth.uid() = author_id OR is_admin());

DROP POLICY IF EXISTS "Event photos viewable by everyone" ON event_photos;
CREATE POLICY "Event photos viewable by everyone" ON event_photos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can upload event photos" ON event_photos;
CREATE POLICY "Authenticated can upload event photos" ON event_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own photos" ON event_photos;
CREATE POLICY "Users can delete own photos" ON event_photos FOR DELETE USING (
  auth.uid() = user_id 
  OR is_admin()
  OR EXISTS (SELECT 1 FROM parties WHERE parties.id = event_photos.event_id AND parties.host_id = auth.uid())
);


-- 7. SETTINGS & PROMO BANNERS (관리자 전용 업데이트, 그 외 누구나 조회)
DROP POLICY IF EXISTS "Settings viewable by everyone" ON settings;
CREATE POLICY "Settings viewable by everyone" ON settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can update settings" ON settings;
CREATE POLICY "Only admins can update settings" ON settings FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Only admins can insert settings" ON settings;
CREATE POLICY "Only admins can insert settings" ON settings FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Promo banners viewable by everyone" ON promo_banners;
CREATE POLICY "Promo banners viewable by everyone" ON promo_banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Only admins can change banners" ON promo_banners;
CREATE POLICY "Only admins can change banners" ON promo_banners FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Users can view own points" ON point_history;
CREATE POLICY "Users can view own points" ON point_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Point history inserts by authenticated or admin" ON point_history;
CREATE POLICY "Point history inserts by authenticated or admin" ON point_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Point history modifications by admin only" ON point_history;
CREATE POLICY "Point history modifications by admin only" ON point_history FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "Point history deletions by admin only" ON point_history;
CREATE POLICY "Point history deletions by admin only" ON point_history FOR DELETE USING (is_admin());


ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own goal" ON user_goals;
CREATE POLICY "Users can insert own goal" ON user_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own goal" ON user_goals;
CREATE POLICY "Users can update own goal" ON user_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own goal" ON user_goals;
CREATE POLICY "Users can view own goal" ON user_goals FOR SELECT USING (auth.uid() = user_id);

-- 완료
