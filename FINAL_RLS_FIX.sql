-- --------------------------------------------------------------------------------
-- 🚨 SUPABASE RLS 완전 초기화 및 복구 스크립트 🚨
-- 
-- 무한 루프 에러("infinite recursion detected in policy for relation profiles")를
-- 완벽하게 해결하기 위해 profiles 테이블의 모든 정책을 초기화하고 재설정합니다.
--
-- 이 내용을 복사해서 Supabase Dashboard > SQL Editor에 붙여넣고 [RUN]을 실행해주세요!
-- --------------------------------------------------------------------------------

-- 1. profiles 테이블의 정책으로 인한 무한루프 방지를 위해 is_admin() 함수 강제 삭제 (관련 정책도 모두 지워집니다)
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- 2. profiles 테이블의 기존 정책 강제 삭제
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- 3. profiles 테이블에 안전한 정책만 재설정 (관리자 함수 참조를 없앰)
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);


-- =====================================================================
-- 4. 나머지 테이블들을 위한 안전한 관리자 권한 확인 함수 복구 (다른 테이블용)
-- =====================================================================
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. 삭제되었던 다른 테이블들의 관리자 및 본인 수정 정책 복구
-- [INSTRUCTORS, DJS, CREATORS 테이블 정책]
CREATE POLICY "Users can update own instructor data" ON instructors FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own dj data" ON djs FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own creator data" ON creators FOR UPDATE USING (auth.uid() = id OR is_admin());

-- [PARTIES & LESSONS]
CREATE POLICY "Host or admin can update parties" ON parties FOR UPDATE USING (auth.uid() = host_id OR is_admin());
CREATE POLICY "Host or admin can delete parties" ON parties FOR DELETE USING (auth.uid() = host_id OR is_admin());

CREATE POLICY "Host or admin can update lessons" ON lessons FOR UPDATE USING (auth.uid() = host_id OR is_admin());
CREATE POLICY "Host or admin can delete lessons" ON lessons FOR DELETE USING (auth.uid() = host_id OR is_admin());

-- [REGISTRATIONS 테이블]
CREATE POLICY "Users can update own registrations" ON registrations FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- [COMMUNITY_POSTS 및 기타 댓글 테이블]
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE POLICY "Users can update own comments" ON community_comments FOR UPDATE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own comments" ON community_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE POLICY "Users can delete own event comments" ON event_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own reviews" ON event_reviews FOR DELETE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own photos" ON event_photos FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- [SETTINGS 및 PROMO BANNERS]
CREATE POLICY "Only admins can update settings" ON settings FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can insert settings" ON settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can change banners" ON promo_banners FOR ALL USING (is_admin());

-- [POINT HISTORY]
CREATE POLICY "Users can view own points" ON point_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Point history modifications by admin only" ON point_history FOR UPDATE USING (is_admin());
CREATE POLICY "Point history deletions by admin only" ON point_history FOR DELETE USING (is_admin());
