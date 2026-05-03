import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { message: 'Refresh token이 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase로 세션 갱신
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { message: '세션 갱신에 실패했습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const isAdmin = isAdminEmail(data.user.email);
    const requiresPasswordChange = data.user.user_metadata?.requiresPasswordChange === true;

    // 도메인 및 접두사 제거
    const displayEmail = data.user.email?.replace('@gmail.com', '').replace(/^user_/, '') || '';

    const user = {
      id: data.user.id,
      email: displayEmail,
      name: data.user.user_metadata?.name || '',
      createdAt: data.user.created_at || new Date().toISOString(),
      isAdmin,
      requiresPasswordChange,
      trainingGoal: data.user.user_metadata?.trainingGoal || '',
    };

    return NextResponse.json({
      user,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { message: '세션 갱신에 실패했습니다.' },
      { status: 401 }
    );
  }
}
