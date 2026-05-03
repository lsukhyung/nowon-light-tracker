import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClientWithAuth, getSupabaseAdmin } from '@/lib/supabase';

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
    const body = await request.json();
    const { newPassword, currentPassword } = body;

    if (!newPassword) {
      return NextResponse.json(
        { message: '새 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: '비밀번호는 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClientWithAuth(token);
    
    // 현재 사용자 정보 가져오기
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다.' },
        { status: 401 }
      );
    }

    // 임시 비밀번호 사용자인지 확인
    const isTemporaryPassword = user.user_metadata?.requiresPasswordChange === true;

    // 임시 비밀번호 사용자가 아닌 경우 현재 비밀번호 필수
    if (!isTemporaryPassword && !currentPassword) {
      return NextResponse.json(
        { message: '현재 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 현재 비밀번호 확인 (임시 비밀번호 사용자가 아닌 경우에만)
    if (currentPassword && !isTemporaryPassword) {
      // 현재 비밀번호로 로그인 시도하여 검증
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        return NextResponse.json(
          { message: '현재 비밀번호가 올바르지 않습니다.' },
          { status: 401 }
        );
      }

      // 로그인 성공 후 새 세션으로 비밀번호 변경
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json(
          { message: '세션을 가져올 수 없습니다.' },
          { status: 401 }
        );
      }

      const authenticatedSupabase = createSupabaseClientWithAuth(session.access_token);
      const { error: updateError } = await authenticatedSupabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json(
          { message: updateError.message || '비밀번호 변경에 실패했습니다.' },
          { status: 400 }
        );
      }

    } else if (isTemporaryPassword) {
      // 임시 비밀번호 사용자: Admin API로 직접 비밀번호 변경
      try {
        const adminClient = getSupabaseAdmin();
        
        // 현재 메타데이터 확인
        console.log('[Password Change] Before update - user metadata:', user.user_metadata);
        
        // Admin API로 비밀번호 업데이트 및 플래그 명시적으로 제거
        // Supabase는 delete로 제거한 필드를 유지하므로, 명시적으로 덮어써야 함
        const updatedMetadata = {
          ...(user.user_metadata || {}),
          requiresPasswordChange: false, // 명시적으로 false 설정
          temporaryPasswordSetAt: null, // 명시적으로 null 설정
          resetRequested: false, // 초기화 요청 플래그 제거
          accountLocked: false,  // 계정 잠금 해제
          failedAttempts: 0,     // 비밀번호 실패 횟수 초기화
        };
        
        console.log('[Password Change] Updating with metadata:', updatedMetadata);
        
        const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
          password: newPassword,
          user_metadata: updatedMetadata,
        });
        
        if (updateError) {
          console.error('[Password Change] Update error:', updateError);
          return NextResponse.json(
            { message: updateError.message || '비밀번호 변경에 실패했습니다.' },
            { status: 400 }
          );
        }
        
        console.log('[Password Change] After update - user metadata:', updateData?.user?.user_metadata);
        console.log('[Password Change] Temporary password changed for:', user.email);
      } catch (adminError: any) {
        console.error('[Password Change] Admin API error:', adminError);
        return NextResponse.json(
          { message: adminError.message || '비밀번호 변경에 실패했습니다.' },
          { status: 500 }
        );
      }
    }

    // 임시 비밀번호 플래그 제거 (일반 사용자의 경우)
    if (!isTemporaryPassword && currentPassword) {
      try {
        const adminClient = getSupabaseAdmin();
        const currentMetadata = user.user_metadata || {};
        
        // 플래그들 초기화 (delete 대신 명시적 값 설정 권장)
        currentMetadata.requiresPasswordChange = false;
        currentMetadata.temporaryPasswordSetAt = null;
        currentMetadata.resetRequested = false;
        currentMetadata.accountLocked = false;
        currentMetadata.failedAttempts = 0;
        
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: currentMetadata,
        });
        
        console.log('[Password Change] Password changed for:', user.email);
      } catch (adminError) {
        // 메타데이터 업데이트 실패해도 비밀번호는 변경되었으므로 경고만 출력
        console.warn('[Password Change] Failed to update metadata:', adminError);
      }
    }

    return NextResponse.json({
      message: '비밀번호가 성공적으로 변경되었습니다.',
      passwordChangeRequired: false, // 비밀번호 변경 완료 표시
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { message: error.message || '비밀번호 변경에 실패했습니다.' },
      { status: error.status || 500 }
    );
  }
}
