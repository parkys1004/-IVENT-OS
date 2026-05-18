-- ============================================================
-- 장소 자동 접수 기능을 위한 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 1. places 테이블에 컬럼 추가
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_type  TEXT DEFAULT 'manual',  -- 'manual' | 'party' | 'lesson'
  ADD COLUMN IF NOT EXISTS source_event_id UUID;

-- 2. 인증된 사용자가 장소를 접수(미승인)할 수 있도록 RLS 정책 추가
--    (기존 정책이 있으면 먼저 삭제 후 재생성)
DROP POLICY IF EXISTS "Users can submit places" ON public.places;
CREATE POLICY "Users can submit places"
  ON public.places
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_approved = false
  );

-- 3. 본인이 접수한 미승인 장소는 본인이 조회 가능
DROP POLICY IF EXISTS "Users can view own submitted places" ON public.places;
CREATE POLICY "Users can view own submitted places"
  ON public.places
  FOR SELECT
  USING (
    is_approved = true
    OR auth.uid() = submitted_by
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 기존의 "select_places" 정책과 충돌할 수 있으므로 제거
DROP POLICY IF EXISTS "select_places" ON public.places;
