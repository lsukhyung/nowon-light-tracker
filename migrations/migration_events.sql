-- ============================================================
-- 이벤트 기능 마이그레이션 (단일 테이블)
-- ============================================================
-- events 테이블: 이벤트 정의 + 당첨자 정보를 하나의 테이블로 관리
-- winner_user_id가 null이면 아직 당첨자 없음, non-null이면 당첨 완료

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 이벤트 정의
  name text NOT NULL,
  light_threshold numeric(10, 2) NOT NULL, -- 달성 기준 빛 수
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- 당첨자 정보 (처음 달성한 사용자, null = 아직 당첨자 없음)
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_user_name text,
  achieved_light numeric(10, 2),
  won_at timestamptz
);

-- ── RLS 설정 ──────────────────────────────────────────────────

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 로그인 사용자는 조회 가능
CREATE POLICY "events_select" ON events
  FOR SELECT TO authenticated USING (true);

-- insert/update/delete: service_role(API)에서 처리
CREATE POLICY "events_insert" ON events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "events_update" ON events
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "events_delete" ON events
  FOR DELETE TO authenticated USING (true);
