import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES, createSupabaseClientWithAuth } from '@/lib/supabase';

// 토큰에서 사용자 ID 추출
async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// RLS를 위해 인증된 클라이언트 생성
function getAuthenticatedClient(token: string) {
  return createSupabaseClientWithAuth(token);
}

// GET /api/training/date/[date] - 특정 날짜의 기록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // RLS를 위해 인증된 클라이언트 사용
    const authSupabase = getAuthenticatedClient(token);

    const { date } = await params;

    const { data: records, error } = await authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .select('*')
      .eq('date', date)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { message: '기록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { message: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Convert snake_case to camelCase for frontend
    const camelCaseRecord = {
      ...records[0],
      createdAt: records[0].created_at,
      updatedAt: records[0].updated_at,
      userId: records[0].user_id,
    };

    return NextResponse.json(camelCaseRecord);
  } catch (error: any) {
    console.error('Get training record by date error:', error);
    return NextResponse.json(
      { message: '기록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
