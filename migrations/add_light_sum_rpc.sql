-- 빛 합계 조회 RPC 함수
-- Supabase SQL Editor에서 실행하세요.

CREATE OR REPLACE FUNCTION get_light_sums(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  my_today_light DECIMAL,
  my_total_light DECIMAL,
  today_total_light DECIMAL,
  all_time_total_light DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(light) FROM daily_practice_logs WHERE user_id = p_user_id AND date = p_date), 0),
    COALESCE((SELECT SUM(light) FROM daily_practice_logs WHERE user_id = p_user_id AND date <= p_date), 0),
    COALESCE((SELECT SUM(light) FROM daily_practice_logs WHERE date = p_date), 0),
    COALESCE((SELECT SUM(light) FROM daily_practice_logs WHERE date <= p_date), 0);
END;
$$ LANGUAGE plpgsql STABLE;
