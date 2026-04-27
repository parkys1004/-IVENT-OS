-- 관심 행사 테이블
CREATE TABLE IF NOT EXISTS event_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- 팔로잉 테이블
CREATE TABLE IF NOT EXISTS artist_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- RLS 활성화
ALTER TABLE event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_follows ENABLE ROW LEVEL SECURITY;

-- 정책 생성
CREATE POLICY "Users can view own bookmarks" ON event_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bookmarks" ON event_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON event_bookmarks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own follows" ON artist_follows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follows" ON artist_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own follows" ON artist_follows FOR DELETE USING (auth.uid() = user_id);
