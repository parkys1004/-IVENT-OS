-- --------------------------------------------------------------------------------
-- SUPABASE RLS 에러 픽스용 스크립트 (기존 정책유지, 함수만 덮어쓰기)
-- --------------------------------------------------------------------------------

-- 기존 에러를 방지하기 위해 DROP 대신 CREATE OR REPLACE 로 안전하게 덮어씁니다.
-- 그리고 관리자 권한 확인 시 프로필 테이블을 조회할 때 무한 루프에 빠지지 않도록
-- plpgsql 로 선언하여 독립된 트랜잭션으로 처리합니다.

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
