import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientWithAuth, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminPermission } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createSupabaseClientWithAuth(token);

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    if (!checkAdminPermission(user.email)) {
      return NextResponse.json(
        { message: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    // 사용자 목록 조회는 Supabase Admin API가 필요합니다
    const adminClient = getSupabaseAdmin();
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Admin] Failed to list users:', listError);
      throw new Error('사용자 목록 조회에 실패했습니다.');
    }

    // 필요한 정보만 추출하고 전화번호 형식 복원
    const users = usersData.users.map(u => {
      // 저장용 전화번호 (도메인 및 접두사 제거)
      const displayEmail = u.email?.replace('@gmail.com', '').replace(/^user_/, '') || '';
      
      return {
        id: u.id,
        email: displayEmail,
        name: u.user_metadata?.name || '',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        resetRequested: u.user_metadata?.resetRequested || false,
        accountLocked: u.user_metadata?.accountLocked || false,
        failedAttempts: u.user_metadata?.failedAttempts || 0,
      };
    });
    
    return NextResponse.json({
      users,
      message: '사용자 목록을 성공적으로 불러왔습니다.',
    });
  } catch (error: unknown) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '사용자 목록 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}
