-- Supabase SQL Editor에서 실행하세요.
-- profiles 테이블에 preferences(선호도) 컬럼을 추가합니다.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"genres": [], "regions": [], "roles": [], "types": [], "autoApplied": false}';

-- RLS 정책 확인 (필요시 프로필 업데이트 권한 확인)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
