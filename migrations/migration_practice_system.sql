-- ============================================================
-- 1만 빛 모으기 역사 - 실천과제 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 기존 테이블 제거 (필요 시)
DROP TABLE IF EXISTS public.daily_practice_logs CASCADE;
DROP TABLE IF EXISTS public.user_practice_settings CASCADE;
DROP TABLE IF EXISTS public.user_goals CASCADE;
DROP TABLE IF EXISTS public.practice_items CASCADE;

-- ============================================================
-- 2. practice_items (실천과제 마스터)
-- ============================================================
CREATE TABLE public.practice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,                   -- 실천 기준 설명 (예: "1회 0.5빛", "24분 1빛")
    light_per_unit DECIMAL(5,2) NOT NULL DEFAULT 1,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL → 시스템 기본
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.practice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read practice items"
    ON public.practice_items FOR SELECT
    USING (is_default = TRUE OR created_by = auth.uid());

CREATE POLICY "Users can insert their own practice items"
    ON public.practice_items FOR INSERT
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own practice items"
    ON public.practice_items FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own practice items"
    ON public.practice_items FOR DELETE
    USING (created_by = auth.uid());

-- ============================================================
-- 3. user_practice_settings (사용자 과제 선택 설정)
-- ============================================================
CREATE TABLE public.user_practice_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_item_id UUID NOT NULL REFERENCES public.practice_items(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, practice_item_id)
);

ALTER TABLE public.user_practice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice settings"
    ON public.user_practice_settings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. daily_practice_logs (일별 실천 기록)
-- ============================================================
CREATE TABLE public.daily_practice_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_item_id UUID NOT NULL REFERENCES public.practice_items(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    light DECIMAL(7,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, practice_item_id, date)
);

ALTER TABLE public.daily_practice_logs ENABLE ROW LEVEL SECURITY;

-- 본인의 기록만 관리
CREATE POLICY "Users can manage their own logs"
    ON public.daily_practice_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 기록 읽기 허용 (service_role key 사용 시 RLS 우회)

-- ============================================================
-- 5. user_goals (사용자 목표)
-- ============================================================
CREATE TABLE public.user_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    daily_light_goal DECIMAL(7,2) NOT NULL DEFAULT 0,   -- 1일 목표 빛
    total_light_goal DECIMAL(10,2) NOT NULL DEFAULT 0,  -- 누적 목표 빛
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
    ON public.user_goals FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. 기본 실천과제 시드 데이터 (10개, created_by = NULL)
-- ============================================================
INSERT INTO public.practice_items (name, description, light_per_unit, is_default, created_by) VALUES
    ('체조',         '1회 0.5빛',       0.5, TRUE, NULL),
    ('회건술',       '1회 0.5빛',       0.5, TRUE, NULL),
    ('행공',         '24분 1빛',        1.0, TRUE, NULL),
    ('본수련',       '24분 1빛',        1.0, TRUE, NULL),
    ('현무',         '24분 1빛',        1.0, TRUE, NULL),
    ('석문기공',     '1회 1빛',         1.0, TRUE, NULL),
    ('석문도서봉독', '24분 1빛',        1.0, TRUE, NULL),
    ('도장출석',     '1회 1빛',         1.0, TRUE, NULL),
    ('석문강좌 시청','1강 1빛',          1.0, TRUE, NULL),
    ('선차 마시기',  '3잔 이상 1빛',    1.0, TRUE, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_daily_practice_logs_user_date
    ON public.daily_practice_logs (user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_practice_logs_date
    ON public.daily_practice_logs (date);

CREATE INDEX IF NOT EXISTS idx_user_practice_settings_user
    ON public.user_practice_settings (user_id);
