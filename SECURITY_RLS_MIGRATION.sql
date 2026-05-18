-- ============================================================
-- SECURITY: RLS Policies & Trigger Migration
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 순서대로 실행할 것
-- ============================================================


-- ============================================================
-- 1. profiles 테이블
--    - 모든 사용자: 공개 프로필 조회 가능
--    - 자신만: 자신의 프로필 수정 가능
--    - 트리거: 사용자가 자신의 role을 직접 변경 불가
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 공개 조회 (모든 인증 사용자 + 비로그인도 허용 — 공개 커뮤니티)
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- 자신의 프로필만 수정
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 자신의 프로필 생성 (최초 회원가입)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 자신의 프로필 삭제 (탈퇴)
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- 트리거: 사용자가 자신의 role을 admin으로 직접 변경하는 것을 DB 레벨에서 차단
CREATE OR REPLACE FUNCTION public.prevent_self_role_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 일반 사용자가 자신의 role을 admin으로 바꾸려는 경우 차단
  IF auth.uid() = OLD.id
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NEW.role = 'admin'
     AND OLD.role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: users cannot promote themselves to admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_to_admin_trigger ON public.profiles;
CREATE TRIGGER prevent_self_role_to_admin_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_to_admin();


-- ============================================================
-- 2. user_ai_configs 테이블
--    - 자신의 설정만 CRUD 가능
--    - 다른 사용자의 API 키 접근 완전 차단
-- ============================================================

ALTER TABLE public.user_ai_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_configs_select_own" ON public.user_ai_configs;
CREATE POLICY "ai_configs_select_own"
  ON public.user_ai_configs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_configs_insert_own" ON public.user_ai_configs;
CREATE POLICY "ai_configs_insert_own"
  ON public.user_ai_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_configs_update_own" ON public.user_ai_configs;
CREATE POLICY "ai_configs_update_own"
  ON public.user_ai_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_configs_delete_own" ON public.user_ai_configs;
CREATE POLICY "ai_configs_delete_own"
  ON public.user_ai_configs FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- 3. parties 테이블
--    - published 상태: 모든 사람이 조회 가능
--    - draft/pending: 본인(host) 또는 admin만 조회
--    - INSERT: 로그인한 사용자, host_id = 자신
--    - UPDATE/DELETE: 본인 또는 admin
-- ============================================================

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- 조회: published는 전체 공개, 그 외는 본인/admin만
DROP POLICY IF EXISTS "parties_select" ON public.parties;
CREATE POLICY "parties_select"
  ON public.parties FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 등록: 로그인 사용자, host_id는 반드시 자신
DROP POLICY IF EXISTS "parties_insert_own" ON public.parties;
CREATE POLICY "parties_insert_own"
  ON public.parties FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- 수정: 본인 또는 admin
DROP POLICY IF EXISTS "parties_update_own_or_admin" ON public.parties;
CREATE POLICY "parties_update_own_or_admin"
  ON public.parties FOR UPDATE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 삭제: 본인 또는 admin
DROP POLICY IF EXISTS "parties_delete_own_or_admin" ON public.parties;
CREATE POLICY "parties_delete_own_or_admin"
  ON public.parties FOR DELETE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 4. lessons 테이블 (parties와 동일한 구조)
-- ============================================================

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
CREATE POLICY "lessons_select"
  ON public.lessons FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "lessons_insert_own" ON public.lessons;
CREATE POLICY "lessons_insert_own"
  ON public.lessons FOR INSERT
  WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "lessons_update_own_or_admin" ON public.lessons;
CREATE POLICY "lessons_update_own_or_admin"
  ON public.lessons FOR UPDATE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "lessons_delete_own_or_admin" ON public.lessons;
CREATE POLICY "lessons_delete_own_or_admin"
  ON public.lessons FOR DELETE
  USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 5. places 테이블
--    - is_approved=true: 전체 공개
--    - is_approved=false: 제출자 또는 admin만 조회
--    - INSERT: 로그인 사용자 (is_approved=false 강제)
--    - UPDATE/DELETE: admin만
-- ============================================================

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "places_select" ON public.places;
CREATE POLICY "places_select"
  ON public.places FOR SELECT
  USING (
    is_approved = true
    OR auth.uid()::text = submitted_by::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 일반 사용자는 is_approved=false로만 INSERT 가능
DROP POLICY IF EXISTS "places_insert_user" ON public.places;
CREATE POLICY "places_insert_user"
  ON public.places FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_approved = false
  );

-- admin만 수정/삭제 (승인 처리 포함)
DROP POLICY IF EXISTS "places_update_admin" ON public.places;
CREATE POLICY "places_update_admin"
  ON public.places FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "places_delete_admin" ON public.places;
CREATE POLICY "places_delete_admin"
  ON public.places FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 6. 성능 인덱스 (RLS 조건 최적화)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_parties_host_id ON public.parties(host_id);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties(status);
CREATE INDEX IF NOT EXISTS idx_lessons_host_id ON public.lessons(host_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_places_is_approved ON public.places(is_approved);
CREATE INDEX IF NOT EXISTS idx_user_ai_configs_user_id ON public.user_ai_configs(user_id);
