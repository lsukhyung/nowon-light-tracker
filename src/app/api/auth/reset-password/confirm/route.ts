import { NextRequest, NextResponse } from 'next/server';
import { updatePassword } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { newPassword, token } = body;

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

    // 토큰이 제공된 경우 (이메일 링크에서 접근)
    if (token) {
      // Supabase는 이메일 링크의 토큰을 자동으로 처리하므로
      // 클라이언트 사이드에서 처리하는 것이 더 적합합니다.
      // 여기서는 서버 사이드에서 세션을 확인하여 처리합니다.
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json(
          { message: '유효하지 않은 세션입니다. 비밀번호 재설정 링크를 다시 요청해주세요.' },
          { status: 401 }
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return NextResponse.json(
          { message: error.message || '비밀번호 재설정에 실패했습니다.' },
          { status: 400 }
        );
      }
    } else {
      // 토큰 없이 호출된 경우 (이미 인증된 사용자)
      try {
        await updatePassword(newPassword);
      } catch (error: any) {
        return NextResponse.json(
          { message: error.message || '비밀번호 재설정에 실패했습니다.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      message: '비밀번호가 성공적으로 재설정되었습니다.',
    });
  } catch (error: any) {
    console.error('Confirm reset password error:', error);
    return NextResponse.json(
      { message: error.message || '비밀번호 재설정에 실패했습니다.' },
      { status: error.status || 500 }
    );
  }
}
