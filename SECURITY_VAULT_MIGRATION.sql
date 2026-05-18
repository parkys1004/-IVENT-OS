-- ============================================================
-- SECURITY: API Key Encryption with pgsodium (Supabase Vault)
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 주의: SECURITY_RLS_MIGRATION.sql 실행 후 실행할 것
-- ============================================================


-- ============================================================
-- 1. pgsodium 확장 활성화 (이미 되어 있으면 무시됨)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgsodium;


-- ============================================================
-- 2. API 키 암호화용 전용 키 생성
--    실행 결과로 나오는 key_id (UUID)를 메모해 둘 것
-- ============================================================
INSERT INTO pgsodium.key (name, key_type, status)
VALUES ('ai_api_key_encryption', 'aead-det', 'valid')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- 3. user_ai_configs 테이블에 암호화 컬럼 추가
-- ============================================================
ALTER TABLE public.user_ai_configs
  ADD COLUMN IF NOT EXISTS api_key_encrypted bytea,
  ADD COLUMN IF NOT EXISTS key_id uuid;

-- key_id 초기값 설정 (방금 만든 키)
UPDATE public.user_ai_configs
SET key_id = (SELECT id FROM pgsodium.key WHERE name = 'ai_api_key_encryption' LIMIT 1)
WHERE key_id IS NULL;


-- ============================================================
-- 4. API 키 암호화/복호화 RPC 함수
-- ============================================================

-- [쓰기] API 키를 암호화하여 저장
CREATE OR REPLACE FUNCTION public.upsert_ai_config(
  p_provider  text,
  p_api_key   text,
  p_model     text DEFAULT 'gemini-2.0-flash'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_id   uuid;
  v_user_id  uuid;
  v_encrypted bytea;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_key_id
  FROM pgsodium.key
  WHERE name = 'ai_api_key_encryption'
  LIMIT 1;

  -- pgsodium AEAD 암호화 (키 기반)
  v_encrypted := pgsodium.crypto_aead_det_encrypt(
    p_api_key::bytea,                   -- 평문
    v_user_id::text::bytea,             -- additional data (user_id로 바인딩)
    v_key_id
  );

  INSERT INTO public.user_ai_configs (user_id, provider, api_key_encrypted, key_id, model)
  VALUES (v_user_id, p_provider, v_encrypted, v_key_id, p_model)
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    key_id            = EXCLUDED.key_id,
    model             = EXCLUDED.model;
END;
$$;

-- [읽기] 복호화된 API 키 반환 (자신의 것만)
CREATE OR REPLACE FUNCTION public.get_ai_configs()
RETURNS TABLE(
  id        uuid,
  provider  text,
  api_key   text,
  model     text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.provider,
    CASE
      WHEN c.api_key_encrypted IS NOT NULL AND c.key_id IS NOT NULL THEN
        convert_from(
          pgsodium.crypto_aead_det_decrypt(
            c.api_key_encrypted,
            v_user_id::text::bytea,
            c.key_id
          ),
          'UTF8'
        )
      ELSE c.api_key  -- 기존 평문 키 fallback
    END AS api_key,
    c.model,
    c.created_at
  FROM public.user_ai_configs c
  WHERE c.user_id = v_user_id
  ORDER BY c.created_at DESC;
END;
$$;


-- ============================================================
-- 5. 기존 평문 api_key 데이터를 암호화 컬럼으로 마이그레이션
-- ============================================================
DO $$
DECLARE
  v_key_id uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_key_id
  FROM pgsodium.key
  WHERE name = 'ai_api_key_encryption'
  LIMIT 1;

  FOR rec IN
    SELECT id, user_id, api_key
    FROM public.user_ai_configs
    WHERE api_key IS NOT NULL
      AND api_key_encrypted IS NULL
  LOOP
    UPDATE public.user_ai_configs
    SET
      api_key_encrypted = pgsodium.crypto_aead_det_encrypt(
        rec.api_key::bytea,
        rec.user_id::text::bytea,
        v_key_id
      ),
      key_id  = v_key_id,
      api_key = NULL  -- 평문 제거
    WHERE id = rec.id;
  END LOOP;
END;
$$;


-- ============================================================
-- 6. 마이그레이션 완료 후 평문 컬럼 제거 (선택사항 — 충분히 테스트 후)
-- 준비되면 아래 주석 해제 후 실행:
-- ============================================================
-- ALTER TABLE public.user_ai_configs DROP COLUMN IF EXISTS api_key;


-- ============================================================
-- 완료 확인 쿼리 (직접 실행해서 확인)
-- ============================================================
-- SELECT * FROM public.get_ai_configs();
