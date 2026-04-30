-- 프로필 테이블에 성별 및 SNS 정보 필드 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS kakao_id text;

-- 주석 추가 (나중에 관리하기 편하도록)
COMMENT ON COLUMN profiles.gender IS '성별 (male, female)';
COMMENT ON COLUMN profiles.instagram_url IS '인스타그램 주소 또는 ID';
COMMENT ON COLUMN profiles.facebook_url IS '페이스북 프로필 주소';
COMMENT ON COLUMN profiles.kakao_id IS '카카오톡 ID';
