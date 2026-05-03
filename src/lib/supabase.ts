import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.error(
      '⚠️ Supabase 환경 변수가 설정되지 않았습니다.\n' +
      '`.env.local` 파일에 다음 변수를 설정해주세요:\n' +
      'NEXT_PUBLIC_SUPABASE_URL=your-project-url\n' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n' +
      'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n' +
      '\n' +
      'Supabase 프로젝트 설정에서 값을 가져올 수 있습니다:\n' +
      'https://supabase.com/dashboard/project/_/settings/api'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role key (서버 사이드 전용)
// 주의: 이 클라이언트는 모든 RLS를 우회하므로 서버 사이드에서만 사용해야 합니다
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Please add it to .env.local file. ' +
      'You can find it in Supabase Dashboard > Project Settings > API > service_role key'
    );
  }
  
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return supabaseAdminClient;
}

/**
 * 새 테이블(practice_items, daily_practice_logs 등)은 Supabase 타입 정의가 없으므로
 * any 타입으로 캐스트된 admin client를 반환합니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseAdminAny(): any {
  return getSupabaseAdmin() as any;
}

// Create a Supabase client with user's auth context for RLS
export function createSupabaseClientWithAuth(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// Auth helpers
export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function resetPasswordForEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  });
  if (error) throw error;
  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

// Database helpers
export const TABLES = {
  TRAINING_RECORDS: 'training_records',
  USERS: 'users',
  PRACTICE_ITEMS: 'practice_items',
  USER_PRACTICE_SETTINGS: 'user_practice_settings',
  DAILY_PRACTICE_LOGS: 'daily_practice_logs',
  USER_GOALS: 'user_goals',
} as const;
