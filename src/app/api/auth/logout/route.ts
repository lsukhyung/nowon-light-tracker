import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 클라이언트에서 토큰을 삭제하므로 서버에서는 별도 처리 불필요
  return NextResponse.json({ message: '로그아웃되었습니다.' });
}
