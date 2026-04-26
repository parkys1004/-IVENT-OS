-- --------------------------------------------------------------------------------
-- 🚨 SUPABASE 무한 루프(Infinite Recursion) 완벽 해결 및 RLS 초기화 스크립트 🚨
-- 
-- 프로필 테이블이 서로를 계속해서 참조하는 문제를 해결하기 위해
-- 문제가 된 기존 정책과 함수를 모두 지우고 안전한 방식으로 다시 생성합니다.
--
-- 이 코드를 복사해서 Supabase의 SQL Editor에 붙여넣고 [RUN]을 눌러주세요!!!
-- --------------------------------------------------------------------------------

-- 1. 무한 루프를 유발하는 is_admin 함수와 여기에 묶여있는 모든 정책을 강제로 모두 지웁니다 (CASCADE 사용).
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- 2. 안전한 is_admin 함수 재작성
-- RLS 확인 시 무한루프를 발생시키지 않도록 구성합니다.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- =====================================================================
-- 3. 안전하게 정책 재설정 (profiles 테이블에서는 무한루프 방지를 위해 is_admin을 사용하지 않음)
-- =====================================================================

-- [PROFILES 테이블]
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- 💡 핵심 해결책: profiles 테이블 안에서는 is_admin을 사용하지 않고 본인만 수정하게 바꿈으로써 무한루프를 끊어냅니다!
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);


-- [INSTRUCTORS, DJS, CREATORS 테이블 정책 복구]
CREATE POLICY "Users can update own instructor data" ON instructors FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own dj data" ON djs FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own creator data" ON creators FOR UPDATE USING (auth.uid() = id OR is_admin());


-- [PARTIES & LESSONS (작성자 + 관리자 수정/삭제 정책 복구)]
CREATE POLICY "Host or admin can update parties" ON parties FOR UPDATE USING (auth.uid() = host_id OR is_admin());
CREATE POLICY "Host or admin can delete parties" ON parties FOR DELETE USING (auth.uid() = host_id OR is_admin());

CREATE POLICY "Host or admin can update lessons" ON lessons FOR UPDATE USING (auth.uid() = host_id OR is_admin());
CREATE POLICY "Host or admin can delete lessons" ON lessons FOR DELETE USING (auth.uid() = host_id OR is_admin());


-- [REGISTRATIONS 테이블 정책 복구]
CREATE POLICY "Users can update own registrations" ON registrations FOR UPDATE USING (auth.uid() = user_id OR is_admin());


-- [COMMUNITY_POSTS 및 기타 댓글 테이블 정책 복구]
CREATE POLICY "Users can update own posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own posts" ON community_posts FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE POLICY "Users can update own comments" ON community_comments FOR UPDATE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own comments" ON community_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());

CREATE POLICY "Users can delete own event comments" ON event_comments FOR DELETE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own reviews" ON event_reviews FOR DELETE USING (auth.uid() = author_id OR is_admin());
CREATE POLICY "Users can delete own photos" ON event_photos FOR DELETE USING (auth.uid() = user_id OR is_admin());


-- [SETTINGS 및 PROMO BANNERS (관리자 전용 정책 복구)]
CREATE POLICY "Only admins can update settings" ON settings FOR UPDATE USING (is_admin());
CREATE POLICY "Only admins can insert settings" ON settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Only admins can change banners" ON promo_banners FOR ALL USING (is_admin());


-- [POINT HISTORY 정책 복구]
CREATE POLICY "Users can view own points" ON point_history FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Point history modifications by admin only" ON point_history FOR UPDATE USING (is_admin());
CREATE POLICY "Point history deletions by admin only" ON point_history FOR DELETE USING (is_admin());

-- 완료!
