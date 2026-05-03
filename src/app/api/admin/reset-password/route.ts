import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientWithAuth, supabase, getSupabaseAdmin } from '@/lib/supabase';
import { checkAdminPermission } from '@/lib/admin';
import { generateTemporaryPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabaseClient = createSupabaseClientWithAuth(token);

    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
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

    const body = await request.json();
    const { email, confirm } = body;

    if (!email) {
      return NextResponse.json(
        { message: '사용자 이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 전화번호를 이메일 형식으로 변환
    const formattedEmail = email.includes('@') ? email : `user_${email}@gmail.com`;

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formattedEmail)) {
      return NextResponse.json(
        { message: '올바른 전화번호(또는 이메일) 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 자신의 계정인지 확인
    if (user.email && formattedEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { message: '자신의 비밀번호는 초기화할 수 없습니다. 설정 메뉴에서 비밀번호를 변경해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 존재 확인 - 회원가입 시도 방식 사용
    // Supabase의 제약으로 인해 일반 anon key로는 사용자 존재 여부를 직접 확인하기 어렵습니다
    // 
    // 방법 1 (기존): 더미 비밀번호로 로그인 시도
    // - 사용자 존재 + 잘못된 비밀번호: "Invalid login credentials"
    // - 사용자 없음: "Invalid login credentials" (보안상 동일)
    // - 케이스 1과 2를 구분할 수 없음 (문제!)
    //
    // 방법 2 (새로운): 회원가입 시도
    // - 사용자 이미 존재: "User already registered" 명확한 에러
    // - 사용자 없음: 회원가입 성공 (테스트 사용자 생성됨)
    
    let userExists = false;
    
    try {
      const testPassword = 'AdminTest_' + Date.now() + Math.random() + '_!@#$';
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formattedEmail,
        password: testPassword,
        options: {
          data: {
            name: 'Test User - To Be Deleted',
          },
        },
      });
      
      console.log('[User Check - SignUp Test]', { 
        email: formattedEmail, 
        errorMsg: signUpError?.message, 
        hasUser: !!signUpData?.user
      });
      
      if (signUpError) {
        const errorMessage = signUpError.message.toLowerCase();
        
        // 사용자가 이미 존재하는 경우 (명확한 신호)
        if (
          errorMessage.includes('user already registered') ||
          errorMessage.includes('email already in use') ||
          errorMessage.includes('already registered') ||
          errorMessage.includes('duplicate')
        ) {
          userExists = true;
          console.log('[User Check] User exists - already registered');
        } else {
          // 기타 에러 (네트워크 오류 등)
          console.warn('[User Check] Unexpected signup error:', errorMessage);
          return NextResponse.json(
            { message: '사용자 확인 중 오류가 발생했습니다: ' + signUpError.message, exists: false },
            { status: 400 }
          );
        }
      } else {
        // 회원가입 성공 = 사용자가 존재하지 않았음 (방금 생성됨)
        // 테스트로 생성된 사용자는 Supabase Admin API로 삭제해야 하지만, 여기서는 불가능
        console.log('[User Check] User does NOT exist - test user was created');
        
        return NextResponse.json(
          { 
            message: '해당 이메일로 등록된 사용자를 찾을 수 없습니다.',
            exists: false,
            warning: '사용자 확인 테스트 중 해당 이메일로 임시 사용자가 생성되었습니다. Supabase Dashboard에서 삭제해주세요.'
          },
          { status: 404 }
        );
      }
    } catch (error: unknown) {
      console.error('[User Check] Exception during signup test:', error);
      return NextResponse.json(
        { message: '사용자 확인 중 오류가 발생했습니다.', exists: false },
        { status: 500 }
      );
    }

    // 최종 사용자 존재 여부 확인
    if (!userExists) {
      return NextResponse.json(
        { message: '해당 이메일로 등록된 사용자를 찾을 수 없습니다.', exists: false },
        { status: 404 }
      );
    }

    // 관리자 확인이 필요한 경우
    if (!confirm) {
      return NextResponse.json({
        message: '사용자가 존재합니다. 비밀번호 초기화를 진행하시겠습니까?',
        exists: true,
        requiresConfirmation: true,
      });
    }

    // 관리자 확인 완료 - 임시 비밀번호 생성
    const temporaryPassword = generateTemporaryPassword(12);

    // Supabase Admin API를 사용하여 사용자의 비밀번호를 업데이트
    try {
      const adminClient = getSupabaseAdmin();
      
      // Admin API를 사용하여 사용자의 이메일로 사용자 ID 조회
      const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
      
      if (listError) {
        console.error('[Admin Reset] Failed to list users:', listError);
        throw new Error('사용자 목록 조회에 실패했습니다: ' + listError.message);
      }
      
      const targetUser = users?.users.find(u => u.email?.toLowerCase() === formattedEmail.toLowerCase());
      
      if (!targetUser) {
        return NextResponse.json(
          { message: '해당 전화번호(이메일)로 등록된 사용자를 찾을 수 없습니다.', exists: false },
          { status: 404 }
        );
      }
      
      // Admin API를 사용하여 사용자의 비밀번호 업데이트 및 메타데이터 설정
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        targetUser.id,
        { 
          password: temporaryPassword,
          user_metadata: {
            ...targetUser.user_metadata,
            requiresPasswordChange: true,
            temporaryPasswordSetAt: new Date().toISOString(),
            failedAttempts: 0,
            accountLocked: false,
            resetRequested: false, // Ensure we clear the request flag too
          }
        }
      );
      
      if (updateError) {
        console.error('[Admin Reset] Failed to update password:', updateError);
        throw new Error('비밀번호 업데이트에 실패했습니다: ' + updateError.message);
      }
      
      console.log('[Admin Reset] Password updated successfully for:', formattedEmail);
      
      return NextResponse.json({
        message: '비밀번호가 초기화되었습니다.',
        email,
        temporaryPassword,
        note: '이 임시 비밀번호는 1회용입니다. 사용자는 이 비밀번호로 로그인한 후 반드시 비밀번호를 변경해야 합니다.',
      });
    } catch (adminError: unknown) {
      console.error('[Admin Reset] Admin API error:', adminError);
      return NextResponse.json(
        { message: adminError instanceof Error ? adminError.message : '비밀번호 초기화에 실패했습니다.' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '비밀번호 초기화에 실패했습니다.' },
      { status: 500 }
    );
  }
}
