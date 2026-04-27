-- 전체 사용자 순위(백분율)를 계산하여 업데이트하는 함수
CREATE OR REPLACE FUNCTION update_user_rankings() 
RETURNS VOID AS $$
BEGIN
  WITH ranked_users AS (
    SELECT id, 
           PERCENT_RANK() OVER (ORDER BY points DESC) as rnk
    FROM profiles
    WHERE points > 0 -- 포인트가 있는 사용자만 대상으로 함
  )
  UPDATE profiles
  SET rank_percentile = FLOOR(ranked_users.rnk * 100)
  FROM ranked_users
  WHERE profiles.id = ranked_users.id;
END;
$$ LANGUAGE plpgsql;
