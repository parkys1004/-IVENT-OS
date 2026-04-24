-- [보안 수준 낮춤] 프로토타이핑/테스트를 위한 RLS(Row Level Security) 비활성화
-- Supabase SQL Editor에 복사하여 실행해주세요.

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
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

-- 만약 완전히 RLS를 끄고 싶지 않으시다면 아래의 허용 정책(Policy)만 추가하셔도 좋습니다.
/*
CREATE POLICY "Enable read access for all users" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable insert for all authenticated users" ON profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for all authenticated users" ON profiles FOR UPDATE USING (auth.role() = 'authenticated');
*/
