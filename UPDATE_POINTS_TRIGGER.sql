-- 포인트 기록이 추가/삭제될 때마다 profiles 테이블의 포인트 값을 자동 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_user_points() 
RETURNS TRIGGER AS $$
BEGIN
  -- 삽입 혹은 삭제 시점에 user_id의 총 포인트 합계를 계산하여 profiles에 업데이트
  IF (TG_OP = 'INSERT' OR TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    UPDATE profiles
    SET points = (SELECT COALESCE(SUM(amount), 0) FROM point_history WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER 생성 (point_history 테이블에 변화가 있을 때마다 호출)
DROP TRIGGER IF EXISTS trg_update_points ON point_history;
CREATE TRIGGER trg_update_points
AFTER INSERT OR UPDATE OR DELETE ON point_history
FOR EACH ROW EXECUTE FUNCTION update_user_points();
