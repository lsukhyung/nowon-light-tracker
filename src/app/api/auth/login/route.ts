import { NextRequest, NextResponse } from 'next/server';
import { signIn, getSupabaseAdmin } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호를 이메일 형식으로 변환 (Supabase Auth 요구사항 - 실제 존재하는 도메인이어야 함)
    const formattedEmail = email.includes('@') ? email : `user_${email}@gmail.com`;

    // 1. 관리자 API를 통해 사용자 정보 조회 (잠금 및 실패 횟수 확인)
    const adminClient = getSupabaseAdmin();
    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const targetUser = usersData?.users.find(u => u.email?.toLowerCase() === formattedEmail.toLowerCase());

    if (targetUser?.user_metadata?.accountLocked) {
      return NextResponse.json(
        { message: '비밀번호 5회 오류로 계정이 잠겼습니다. 관리자에게 초기화를 요청하세요.' },
        { status: 403 }
      );
    }

    if (targetUser?.user_metadata?.resetRequested) {
      return NextResponse.json(
        { message: '현재 비밀번호 초기화가 요청된 상태입니다. 관리자의 승인을 기다려주세요.' },
        { status: 403 }
      );
    }

    let result;
    try {
      result = await signIn(formattedEmail, password);

      // 로그인 성공: 실패 횟수가 0이 아니면 초기화
      if (targetUser && (targetUser.user_metadata?.failedAttempts > 0 || targetUser.user_metadata?.accountLocked)) {
        await adminClient.auth.admin.updateUserById(targetUser.id, {
          user_metadata: {
            ...targetUser.user_metadata,
            failedAttempts: 0,
            accountLocked: false,
          }
        });
      }
    } catch (signInError: unknown) {
      // 로그인 실패 처리
      if (signInError instanceof Error && signInError.message === 'Invalid login credentials' && targetUser) {
        const failedAttempts = (targetUser.user_metadata?.failedAttempts || 0) + 1;
        let accountLocked = false;
        
        if (failedAttempts >= 5) {
          accountLocked = true;
        }

        // 실패 횟수 및 잠금 상태 업데이트
        await adminClient.auth.admin.updateUserById(targetUser.id, {
          user_metadata: {
            ...targetUser.user_metadata,
            failedAttempts,
            accountLocked,
          }
        });

        if (accountLocked) {
          return NextResponse.json(
            { message: '비밀번호 5회 오류로 계정이 잠겼습니다. 관리자에게 초기화를 요청하세요.' },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            { message: `아이디 또는 비밀번호 오류입니다. (실패 ${failedAttempts}/5회)` },
            { status: 401 }
          );
        }
      }
      
      throw signInError; // 다른 에러는 바깥의 catch로 넘김
    }

    if (!result.user || !result.session) {
      return NextResponse.json(
        { message: '로그인에 실패했습니다.' },
        { status: 401 }
      );
    }

    // 서버 사이드에서 관리자 여부 확인 (보안)
    const isAdmin = isAdminEmail(result.user.email);
    
    // 임시 비밀번호 사용 여부 확인 (명시적으로 true인 경우만)
    const requiresPasswordChange = result.user.user_metadata?.requiresPasswordChange === true;
    
    // 디버깅을 위한 로그
    console.log('[Login] User metadata:', result.user.user_metadata);
    console.log('[Login] requiresPasswordChange value:', result.user.user_metadata?.requiresPasswordChange);
    console.log('[Login] requiresPasswordChange (boolean):', requiresPasswordChange);

    // 저장용 전화번호 (도메인 및 접두사 제거)
    const displayEmail = result.user.email?.replace('@gmail.com', '').replace(/^user_/, '') || email;

    // Supabase user 객체를 프론트엔드 형식으로 변환
    const user = {
      id: result.user.id,
      email: displayEmail,
      name: result.user.user_metadata?.name || '',
      createdAt: result.user.created_at || new Date().toISOString(),
      isAdmin, // 관리자 여부 포함 (서버에서 확인)
      requiresPasswordChange, // 비밀번호 변경 필요 여부
      trainingGoal: result.user.user_metadata?.trainingGoal || '', // 수련 목표
    };

    // 사용자 정보와 토큰 반환 (refresh_token 포함)
    return NextResponse.json({
      user,
      token: result.session.access_token,
      refreshToken: result.session.refresh_token,
      requiresPasswordChange,
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    
    let errorMessage = '로그인에 실패했습니다.';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage === 'Invalid login credentials') {
        errorMessage = '아이디 또는 비밀번호 오류입니다.';
      }
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 401 }
    );
  }
}
