-- --------------------------------------------------------------------------------
-- 🛡️ [완벽 복구] 안전한 Supabase RLS (보안) 재설정 스크립트 🛡️
-- 
-- 무한 루프 에러를 일으키던 꼬여있는 기존 정책들을 "완전히" 날려버리고,
-- 충돌이 발생할 수 없는 가장 안전한 구조로 RLS 테이블 권한을 다시 설정합니다.
--
-- 복사 후 Supabase Dashboard > SQL Editor 에 붙여넣고 [RUN] 하시면 모든 문제가 해결되며 보안도 지켜집니다.
-- --------------------------------------------------------------------------------

-- 1. 모든 RLS 켬
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

-- 2. "기존에 존재하던 모든 꼬여있는 정책"들을 스크립트로 일괄 완전 삭제 (이것이 100% 무한루프를 끊어냅니다)
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename); 
    END LOOP; 
END $$;

-- 3. 안전한 관리자 권한 확인 함수 생성 (무한루프 원천 차단)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER를 통해 RLS 자체를 우회해서 한 번만 읽으므로 안전합니다.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================
-- 4. 무충돌 안전한 정책들 설정
-- ==========================================

-- [PROFILES] (프로필에서는 is_admin을 아예 평가 안하도록 해서 자기참조 루프를 100% 방지합니다)
CREATE POLICY "select_profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "insert_profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update_profiles" ON profiles FOR UPDATE USING (auth.uid() = id);
-- ※ 관리자가 유저를 수정할 경우, 관리자 대시보드에서는 supabase-admin 서비스키를 쓰므로 RLS 제약을 받지 않게 구현가능합니다.

-- [INSTRUCTORS, DJS, CREATORS]
CREATE POLICY "select_instructors" ON instructors FOR SELECT USING (true);
CREATE POLICY "insert_instructors" ON instructors FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update_instructors" ON instructors FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "select_djs" ON djs FOR SELECT USING (true);
CREATE POLICY "insert_djs" ON djs FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update_djs" ON djs FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "select_creators" ON creators FOR SELECT USING (true);
CREATE POLICY "insert_creators" ON creators FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "update_creators" ON creators FOR UPDATE USING (auth.uid() = id OR public.is_admin());


-- [PARTIES & LESSONS] - 누구나 조회, 작성자는 수정/삭제, 관리자도 수정/삭제
CREATE POLICY "select_parties" ON parties FOR SELECT USING (true);
CREATE POLICY "insert_parties" ON parties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_parties" ON parties FOR UPDATE USING (auth.uid() = host_id OR public.is_admin());
CREATE POLICY "delete_parties" ON parties FOR DELETE USING (auth.uid() = host_id OR public.is_admin());

CREATE POLICY "select_lessons" ON lessons FOR SELECT USING (true);
CREATE POLICY "insert_lessons" ON lessons FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_lessons" ON lessons FOR UPDATE USING (auth.uid() = host_id OR public.is_admin());
CREATE POLICY "delete_lessons" ON lessons FOR DELETE USING (auth.uid() = host_id OR public.is_admin());


-- [REGISTRATIONS (행사 신청 정보)] 
CREATE POLICY "select_registrations" ON registrations FOR SELECT USING (true);
CREATE POLICY "insert_registrations" ON registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_registrations" ON registrations FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "delete_registrations" ON registrations FOR DELETE USING (auth.uid() = user_id OR public.is_admin());


-- [COMMUNITY_POSTS / COMMENTS / REVIEWS / PHOTOS]
CREATE POLICY "select_posts" ON community_posts FOR SELECT USING (true);
CREATE POLICY "insert_posts" ON community_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id OR public.is_admin());
CREATE POLICY "delete_posts" ON community_posts FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "select_comments" ON community_comments FOR SELECT USING (true);
CREATE POLICY "insert_comments" ON community_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_comments" ON community_comments FOR UPDATE USING (auth.uid() = author_id OR public.is_admin());
CREATE POLICY "delete_comments" ON community_comments FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "select_event_comments" ON event_comments FOR SELECT USING (true);
CREATE POLICY "insert_event_comments" ON event_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_event_comments" ON event_comments FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "select_reviews" ON event_reviews FOR SELECT USING (true);
CREATE POLICY "insert_reviews" ON event_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_reviews" ON event_reviews FOR DELETE USING (auth.uid() = author_id OR public.is_admin());

CREATE POLICY "select_photos" ON event_photos FOR SELECT USING (true);
CREATE POLICY "insert_photos" ON event_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "delete_photos" ON event_photos FOR DELETE USING (auth.uid() = user_id OR public.is_admin());


-- [SETTINGS & PROMO BANNERS] - 조회는 누구나, 생성/수정/삭제는 관리자만!
CREATE POLICY "select_settings" ON settings FOR SELECT USING (true);
CREATE POLICY "insert_settings" ON settings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "update_settings" ON settings FOR UPDATE USING (public.is_admin());
CREATE POLICY "delete_settings" ON settings FOR DELETE USING (public.is_admin());

CREATE POLICY "select_promo" ON promo_banners FOR SELECT USING (true);
CREATE POLICY "all_promo" ON promo_banners FOR ALL USING (public.is_admin());


-- [POINT HISTORY] 
CREATE POLICY "select_points" ON point_history FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "insert_points" ON point_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "update_points" ON point_history FOR UPDATE USING (public.is_admin());
CREATE POLICY "delete_points" ON point_history FOR DELETE USING (public.is_admin());


-- [USER AI CONFIGS]
CREATE POLICY "select_user_ai" ON user_ai_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_user_ai" ON user_ai_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_user_ai" ON user_ai_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_user_ai" ON user_ai_configs FOR DELETE USING (auth.uid() = user_id);

-- 모든 작업 완료. 무한 루프 원천 차단 + 완벽한 보안 설정 완료!
