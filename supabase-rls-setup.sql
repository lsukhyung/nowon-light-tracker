-- 1. 수련 기록 테이블 생성 (training_records)
CREATE TABLE IF NOT EXISTS public.training_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- 수련 항목들
    "체조" BOOLEAN NOT NULL DEFAULT false,
    "행공" INTEGER NOT NULL DEFAULT 0,
    "본수련" INTEGER NOT NULL DEFAULT 0,
    "회건술" BOOLEAN NOT NULL DEFAULT false,
    "석문도서봉독" BOOLEAN NOT NULL DEFAULT false,
    "행공퍼센트" INTEGER NOT NULL DEFAULT 0,
    "운광복습" INTEGER NOT NULL DEFAULT 0,
    "삼주축광" INTEGER NOT NULL DEFAULT 0,
    "내면공간" INTEGER NOT NULL DEFAULT 0,
    "마음과마음가짐수련" INTEGER NOT NULL DEFAULT 0,
    "나의역사" BOOLEAN NOT NULL DEFAULT false,
    "회광반조" TEXT NOT NULL DEFAULT 'C',
    "성찰탐구" TEXT NOT NULL DEFAULT 'C',
    memo TEXT,

    -- 한 사용자가 같은 날짜에 여러 번 기록하지 못하도록 유니크 제약 조건 (옵션)
    UNIQUE(user_id, date)
);

-- 2. Row Level Security (RLS) 활성화
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;

-- 3. 기존 정책 초기화 (덮어쓰기 용이함)
DROP POLICY IF EXISTS "Users can view their own training records" ON training_records;
DROP POLICY IF EXISTS "Users can insert their own training records" ON training_records;
DROP POLICY IF EXISTS "Users can update their own training records" ON training_records;
DROP POLICY IF EXISTS "Users can delete their own training records" ON training_records;

-- 4. RLS 정책 생성 (내 데이터만 읽기/추가/수정/삭제 가능)
CREATE POLICY "Users can view their own training records"
  ON public.training_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training records"
  ON public.training_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training records"
  ON public.training_records FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training records"
  ON public.training_records FOR DELETE
  USING (auth.uid() = user_id);
