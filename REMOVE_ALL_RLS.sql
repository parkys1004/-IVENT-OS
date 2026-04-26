-- --------------------------------------------------------------------------------
-- 🚨 [긴급 복구] 모든 보안 정책(RLS) 해제 및 무한루프 제거 스크립트 🚨
-- 
-- 안내: "보안을 강화하는 대신 문제없이 작동하도록 해달라"는 요청에 맞춰,
-- 현재 발생하고 있는 infinite recursion(무한 루프) 에러를 발생시키는
-- 모든 정책을 날리고 테이블의 RLS를 비활성화(끄기)합니다.
--
-- 이 스크립트를 Supabase Dashboard > SQL Editor에 복사하고 [RUN]을 눌러주세요.
-- --------------------------------------------------------------------------------

-- 1. 무한 루프의 주범이었던 함수 완전히 삭제
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- 2. 모든 테이블의 RLS 비활성화 (보안 제한 해제)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE instructors DISABLE ROW LEVEL SECURITY;
ALTER TABLE djs DISABLE ROW LEVEL SECURITY;
ALTER TABLE creators DISABLE ROW LEVEL SECURITY;
ALTER TABLE parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE promo_banners DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_configs DISABLE ROW LEVEL SECURITY;

-- 이제 애플리케이션은 기존처럼 아무런 에러 없이(권한 막힘 없이) 모든 데이터를 불러오게 됩니다.
