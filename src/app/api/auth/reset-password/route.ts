import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordForEmail } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { message: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 비밀번호 재설정 이메일 전송
    await resetPasswordForEmail(email);

    // 보안을 위해 항상 성공 메시지 반환 (이메일이 존재하지 않아도 동일한 응답)
    return NextResponse.json({
      message: '비밀번호 재설정 링크가 이메일로 전송되었습니다. 이메일을 확인해주세요.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    // 보안을 위해 구체적인 에러 메시지 대신 일반적인 메시지 반환
    return NextResponse.json(
      { message: '비밀번호 재설정 링크 전송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
