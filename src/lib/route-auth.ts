import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export type AuthResult = { user: { id: string; email?: string }; token: string };

/**
 * 요청의 Bearer 토큰을 검증해 사용자를 반환한다.
 * 실패 시 401 NextResponse 를 반환하므로 호출측에서 instanceof 로 분기한다:
 *
 *   const auth = await requireUser(request);
 *   if (auth instanceof NextResponse) return auth;
 *   const { user, token } = auth;
 */
export async function requireUser(request: NextRequest): Promise<AuthResult | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
  }
  return { user, token };
}

/** requireUser + 관리자 이메일 검사. 관리자가 아니면 403. */
export async function requireAdmin(request: NextRequest): Promise<AuthResult | NextResponse> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  if (!isAdminEmail(auth.user.email)) {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  return auth;
}
