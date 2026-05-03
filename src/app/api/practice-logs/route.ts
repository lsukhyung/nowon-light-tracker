import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny, createSupabaseClientWithAuth } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function mapLog(log: any) {
  return {
    id: log.id,
    userId: log.user_id,
    practiceItemId: log.practice_item_id,
    date: log.date,
    count: log.count,
    light: log.light,
    practiceItem: log.practice_items ? {
      id: log.practice_items.id,
      name: log.practice_items.name,
      description: log.practice_items.description,
      lightPerUnit: log.practice_items.light_per_unit,
      isDefault: log.practice_items.is_default,
    } : null,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
  };
}

/**
 * GET /api/practice-logs?date=YYYY-MM-DD
 * 특정 날짜의 실천 기록 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) {
    return NextResponse.json({ message: 'date 파라미터가 필요합니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('daily_practice_logs')
    .select(`
      *,
      practice_items (id, name, description, light_per_unit, is_default)
    `)
    .eq('user_id', user.id)
    .eq('date', date);

  if (error) {
    console.error('practice-logs GET error:', error);
    return NextResponse.json({ message: '기록을 불러오는데 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json((data || []).map(mapLog));
}

/**
 * POST /api/practice-logs
 * 실천 기록 upsert (횟수 증감 저장)
 * body: { practiceItemId, date, count, lightPerUnit }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const body = await request.json();
  const { practiceItemId, date, count, lightPerUnit } = body;

  if (!practiceItemId || !date || count === undefined || count === null) {
    return NextResponse.json({ message: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const countNum = Math.max(0, parseInt(count, 10) || 0);
  const lightPerUnitNum = parseFloat(lightPerUnit) || 1;
  const lightTotal = parseFloat((countNum * lightPerUnitNum).toFixed(2));

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('daily_practice_logs')
    .upsert({
      user_id: user.id,
      practice_item_id: practiceItemId,
      date,
      count: countNum,
      light: lightTotal,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,practice_item_id,date' })
    .select(`*, practice_items (id, name, description, light_per_unit, is_default)`)
    .single();

  if (error) {
    console.error('practice-logs POST error:', error);
    return NextResponse.json({ message: '저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapLog(data));
}

/**
 * PUT /api/practice-logs/batch
 * 여러 과제 기록 일괄 저장
 * body: { date, logs: [{ practiceItemId, count, lightPerUnit }] }
 */
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const body = await request.json();
  const { date, logs } = body;

  if (!date || !Array.isArray(logs)) {
    return NextResponse.json({ message: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();
  const rows = logs.map((log: any) => {
    const countNum = Math.max(0, parseInt(log.count, 10) || 0);
    const lightPerUnitNum = parseFloat(log.lightPerUnit) || 1;
    return {
      user_id: user.id,
      practice_item_id: log.practiceItemId,
      date,
      count: countNum,
      light: parseFloat((countNum * lightPerUnitNum).toFixed(2)),
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await admin
    .from('daily_practice_logs')
    .upsert(rows, { onConflict: 'user_id,practice_item_id,date' });

  if (error) {
    console.error('practice-logs batch PUT error:', error);
    return NextResponse.json({ message: '일괄 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: '저장되었습니다.' });
}
