-- 실천과제 소프트 삭제 컬럼 추가
-- 개인이 추가한 실천과제를 삭제해도 기존 실천 내역(daily_practice_logs)이 보존되도록
-- 행을 물리 삭제하지 않고 deleted_at 으로 숨김 처리하기 위한 컬럼.
-- Supabase SQL Editor에서 실행하세요.

ALTER TABLE public.practice_items
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 이미 과거에 삭제로 인해 내역이 끊어진 과제가 있다면 그대로 두고,
-- 앞으로는 API가 deleted_at 만 채우고 행을 삭제하지 않는다.
