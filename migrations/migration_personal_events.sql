-- ============================================================
-- 개인 이벤트 테이블 생성
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- personal_events 테이블: 사용자별 개인 이벤트 + 달성 정보
CREATE TABLE IF NOT EXISTS personal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  name TEXT NOT NULL,
  light_threshold NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  bouquet_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  achieved_light NUMERIC(10, 2),
  achieved_at TIMESTAMPTZ
);

-- RLS 설정
ALTER TABLE personal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_events_select" ON personal_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "personal_events_insert" ON personal_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "personal_events_update" ON personal_events
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "personal_events_delete" ON personal_events
  FOR DELETE TO authenticated USING (true);
