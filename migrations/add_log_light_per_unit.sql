-- daily_practice_logs 에 1회당 빛(light_per_unit) 스냅샷 컬럼 추가
-- 목적: 실천과제의 1회당 빛이 관리자/사용자에 의해 변경되더라도
--       이미 기록된 일자별 로우는 처음 기록된 시점의 빛 단위를 유지하여
--       과거 누적 빛이 조용히 재평가(reprice)되는 현상을 방지.
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.daily_practice_logs
  ADD COLUMN IF NOT EXISTS light_per_unit NUMERIC;

-- 기존 로우는 저장된 light / count 로부터 단위를 역산하여 채운다.
-- count=0 인 로우는 단위를 알 수 없으므로 NULL 로 둔다(저장 시점에 새로 채워짐).
UPDATE public.daily_practice_logs
SET light_per_unit = ROUND(light::numeric / count, 4)
WHERE light_per_unit IS NULL
  AND count > 0;
