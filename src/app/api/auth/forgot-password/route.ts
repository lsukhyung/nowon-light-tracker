import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: '전화번호(아이디)를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호를 내부 이메일 형식으로 변환
    const formattedEmail = email.includes('@') ? email : `user_${email}@gmail.com`;

    const adminClient = getSupabaseAdmin();
    
    // 이메일로 사용자 ID 조회
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('[Forgot Password] Failed to list users:', listError);
      throw new Error('사용자 조회에 실패했습니다.');
    }
    
    const targetUser = users?.users.find(u => u.email?.toLowerCase() === formattedEmail.toLowerCase());
    
    if (!targetUser) {
      // 보안상 사용자가 없어도 성공한 것처럼 응답 (사용자 계정 유무 스니핑 방지)
      // 하지만 프론트엔드에서 즉시 피드백을 주기 위해 여기서는 명시적으로 에러 반환
      return NextResponse.json(
        { message: '가입되지 않은 전화번호입니다.' },
        { status: 404 }
      );
    }

    // 사용자 메타데이터에 비밀번호 초기화 요청 플래그 추가
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUser.id,
      { 
        user_metadata: {
          ...targetUser.user_metadata,
          resetRequested: true,
          resetRequestedAt: new Date().toISOString(),
        }
      }
    );
    
    if (updateError) {
      console.error('[Forgot Password] Failed to update user metadata:', updateError);
      throw new Error('요청 처리에 실패했습니다.');
    }
    
    return NextResponse.json({
      message: '관리자에게 비밀번호 초기화 요청이 전달되었습니다.',
    });
  } catch (error: unknown) {
    console.error('Forgot password error:', error);
    const errorMessage = error instanceof Error ? error.message : '비밀번호 초기화 요청에 실패했습니다.';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
