import { NextRequest, NextResponse } from 'next/server';
import { signUp, getSupabaseAdminAny } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 길이 확인
    if (password.length < 6) {
      return NextResponse.json(
        { message: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 전화번호를 이메일 형식으로 변환 (Supabase Auth 요구사항 - 실제 존재하는 도메인이어야 함)
    const formattedEmail = email.includes('@') ? email : `user_${email}@gmail.com`;

    const result = await signUp(formattedEmail, password, name);

    if (!result.user) {
      return NextResponse.json(
        { message: '회원가입에 실패했습니다.' },
        { status: 500 }
      );
    }

    // 서버 사이드에서 관리자 여부 확인 (보안)
    const isAdmin = isAdminEmail(result.user.email);

    // 기본 실천과제 자동 선택
    try {
      const admin = getSupabaseAdminAny();
      const { data: defaultItems } = await admin
        .from('practice_items')
        .select('id')
        .eq('is_default', true);

      if (defaultItems && defaultItems.length > 0) {
        const settings = defaultItems.map((item: any) => ({
          user_id: result.user!.id,
          practice_item_id: item.id,
          is_active: true,
        }));
        await admin.from('user_practice_settings').upsert(settings, { onConflict: 'user_id,practice_item_id' });
      }
    } catch (err) {
      console.error('기본 실천과제 자동 선택 실패:', err);
    }

    // 저장용 전화번호 (도메인 및 접두사 제거)
    const displayEmail = result.user.email?.replace('@gmail.com', '').replace(/^user_/, '') || email;

    // Supabase user 객체를 프론트엔드 형식으로 변환
    const user = {
      id: result.user.id,
      email: displayEmail,
      name: result.user.user_metadata?.name || name || '',
      createdAt: result.user.created_at || new Date().toISOString(),
      isAdmin, // 관리자 여부 포함 (서버에서 확인)
      trainingGoal: result.user.user_metadata?.trainingGoal || '', // 수련 목표
    };

    // 세션이 있으면 토큰 반환, 없으면 null (이메일 확인 필요할 수 있음)
    const token = result.session?.access_token || null;
    const refreshToken = result.session?.refresh_token || null;

    return NextResponse.json({
      user,
      token,
      refreshToken,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { message: error.message || '회원가입에 실패했습니다.' },
      { status: error.status || 500 }
    );
  }
}
