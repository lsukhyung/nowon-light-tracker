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

// GET /api/training - 사용자의 모든 수련 기록 조회
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
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    // RLS를 위해 인증된 클라이언트 사용
    const authSupabase = getAuthenticatedClient(token);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Supabase 쿼리 빌드 (RLS가 자동으로 user_id 필터링)
    let query = authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .select('*');

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: records, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { message: '기록을 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase for frontend
    const camelCaseRecords = records?.map(record => ({
      ...record,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      userId: record.user_id,
    })) || [];

    return NextResponse.json(camelCaseRecords);
  } catch (error: any) {
    console.error('Get training records error:', error);
    return NextResponse.json(
      { message: '기록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

// POST /api/training - 새 수련 기록 생성
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // 같은 날짜의 기록이 있는지 확인
    const { data: existing } = await authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .select('id')
      .eq('date', body.date)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { message: '이미 해당 날짜의 기록이 있습니다.' },
        { status: 409 }
      );
    }

    // 새 레코드 생성 (user_id를 명시적으로 설정)
    const record = {
      user_id: userId,  // user_id를 명시적으로 설정
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { message: '기록 생성에 실패했습니다.' },
        { status: 500 }
      );
    }

    // Convert snake_case to camelCase for frontend
    const camelCaseRecord = {
      ...created,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
      userId: created.user_id,
    };

    return NextResponse.json(camelCaseRecord, { status: 201 });
  } catch (error: any) {
    console.error('Create training record error:', error);
    return NextResponse.json(
      { message: '기록 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
