import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // 서버 사이드에서 관리자 여부 확인 (보안)
    const isAdmin = isAdminEmail(user.email);
    
    // 임시 비밀번호 사용 여부 확인
    const requiresPasswordChange = user.user_metadata?.requiresPasswordChange === true;

    // 저장용 전화번호 (도메인 및 접두사 제거)
    const displayEmail = user.email?.replace('@gmail.com', '').replace(/^user_/, '') || '';

    // Supabase user 객체를 프론트엔드 형식으로 변환
    const formattedUser = {
      id: user.id,
      email: displayEmail,
      name: user.user_metadata?.name || '',
      createdAt: user.created_at || new Date().toISOString(),
      isAdmin, // 관리자 여부 포함 (서버에서 확인)
      requiresPasswordChange, // 비밀번호 변경 필요 여부
      trainingGoal: user.user_metadata?.trainingGoal || '',
    };

    return NextResponse.json(formattedUser);
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { message: '사용자 정보를 가져오는데 실패했습니다.' },
      { status: 401 }
    );
  }
}
