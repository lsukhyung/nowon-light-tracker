-- ============================================================
-- 사용자 테이블 생성
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin can read all users" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;

CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Service role full access"
    ON public.users FOR ALL
    USING (auth.role() = 'service_role');

-- 4. auth.users → public.users 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 제거 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 기존 auth.users 데이터 동기화 (이미 가입된 사용자)
INSERT INTO public.users (id, name, email, created_at)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'name', ''),
    u.email,
    u.created_at
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
