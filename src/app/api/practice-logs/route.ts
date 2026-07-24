import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminAny } from '@/lib/supabase';
import { requireUser } from '@/lib/route-auth';
import { mapPracticeItemRow } from '@/lib/practice-items';

/**
 * 1회당 빛 단위: stored 스냅샷이 유효하면 그것을, 아니면 활성 과제의 현재 단위(current)를 쓴다.
 * 호출부에서 항상 활성 과제를 사전 검증하므로 current 는 유효해야 하며,
 * stored/current 모두 비정상인 경우는 방어적으로 1로 떨어진다.
 * (과거에는 클라이언트가 보낸 단위로 fallback 했으나, 사전 검증으로 항상 current 가 채워지므로 제거.)
 */
function pickRate(stored: unknown, current: unknown): number {
  const asNum = (v: unknown): number | null => {
    const n = Number(v);
    return !isNaN(n) && n > 0 ? n : null;
  };
  return asNum(stored) ?? asNum(current) ?? 1;
}

const computeLight = (count: number, rate: number) => parseFloat((count * rate).toFixed(2));

function mapLog(log: any) {
  return {
    id: log.id,
    userId: log.user_id,
    practiceItemId: log.practice_item_id,
    date: log.date,
    count: log.count,
    light: log.light,
    // 해당 로우가 처음 기록될 때 고정된 1회당 빛 단위(스냅샷).
    // 과제 단위가 이후에 바뀌어도 이 값은 유지되며, 클라이언트 낙관적 계산에도 이 값을 써야
    // 저장 전 표시/공유 빛이 persist된 값과 일치한다.
    lightPerUnit: log.light_per_unit != null ? Number(log.light_per_unit) : undefined,
    practiceItem: log.practice_items ? mapPracticeItemRow(log.practice_items) : null,
    createdAt: log.created_at,
    updatedAt: log.updated_at,
  };
}

/**
 * GET /api/practice-logs?date=YYYY-MM-DD
 * 특정 날짜의 실천 기록 조회
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

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
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json();
  const { practiceItemId, date, count } = body;

  if (!practiceItemId || !date || count === undefined || count === null) {
    return NextResponse.json({ message: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const countNum = Math.max(0, parseInt(count, 10) || 0);

  const admin = getSupabaseAdminAny();

  // 기존 로우의 단위 스냅샷과 활성 과제 조회를 병렬로 수행한다.
  // 스냅샷이 있더라도 과제가 소프트 삭제되었는지 반드시 검증해야 한다 — 그렇지 않으면
  // stale 클라이언트가 삭제된 과제의 보존 내역을 덮어쓸 수 있다.
  const [existingQ, itemQ] = await Promise.all([
    admin.from('daily_practice_logs')
      .select('light_per_unit')
      .eq('user_id', user.id)
      .eq('practice_item_id', practiceItemId)
      .eq('date', date)
      .maybeSingle(),
    admin.from('practice_items')
      .select('light_per_unit')
      .eq('id', practiceItemId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);
  if (existingQ.error || itemQ.error) {
    console.error('practice-logs preflight error:', existingQ.error || itemQ.error);
    return NextResponse.json({ message: '저장에 실패했습니다.' }, { status: 500 });
  }
  // 활성 과제가 아니면(삭제/미존재) 기록하지 않는다.
  if (!itemQ.data) {
    return NextResponse.json({ message: '존재하지 않는 실천과제입니다.' }, { status: 400 });
  }

  // 1회당 빛은 "해당 (user,item,date) 로우가 처음 만들어진 시점"의 단위를 스냅샷으로 유지.
  // 스냅샷이 있으면 그것을 우선하고, 없으면(신규 로우) 과제의 현재 단위로 스냅샷을 만든다.
  const resolvedRate = pickRate(existingQ.data?.light_per_unit, itemQ.data.light_per_unit);
  const lightTotal = computeLight(countNum, resolvedRate);

  const { data, error } = await admin
    .from('daily_practice_logs')
    .upsert({
      user_id: user.id,
      practice_item_id: practiceItemId,
      date,
      count: countNum,
      light: lightTotal,
      light_per_unit: resolvedRate,
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
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json();
  const { date, logs } = body;

  if (!date || !Array.isArray(logs)) {
    return NextResponse.json({ message: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();

  // 1회당 빛 스냅샷 유지:
  // - 이미 해당 (user,item,date) 로우가 존재하면 그 로우에 기록된 단위를 그대로 사용.
  // - 신규 로우면 practice_items 의 현재 단위를 사용하여 스냅샷으로 저장.
  // 두 조회는 서로 의존하지 않으므로 병렬로 실행한다.
  const itemIds = Array.from(new Set(logs.map((l: any) => l.practiceItemId).filter(Boolean)));

  const [existingLogsRes, itemRowsRes] = await Promise.all([
    admin.from('daily_practice_logs')
      .select('practice_item_id, light_per_unit')
      .eq('user_id', user.id)
      .eq('date', date)
      .in('practice_item_id', itemIds),
    // deleted_at IS NULL 로 걸러 실제 활성 과제만 조회한다.
    // 다른 탭에서 과제가 소프트 삭제되었는데 stale 상태로 저장이 들어오면,
    // 삭제된 과제에 빛이 다시 쓰여지는 것을 막는다.
    admin.from('practice_items')
      .select('id, light_per_unit')
      .in('id', itemIds)
      .is('deleted_at', null),
  ]);
  // 스냅샷/단위 조회가 실패했으면 과거 로우를 현재 단위로 잘못 재계산할 수 있으므로
  // 저장을 중단한다(누적 빛이 조용히 바뀌는 것 방지).
  if (existingLogsRes.error || itemRowsRes.error) {
    console.error('practice-logs preflight error:', existingLogsRes.error || itemRowsRes.error);
    return NextResponse.json({ message: '일괄 저장에 실패했습니다.' }, { status: 500 });
  }
  const currentRateByItem = new Map<string, unknown>(
    (itemRowsRes.data || []).map((r: any) => [r.id, r.light_per_unit])
  );
  const storedByItem = new Map<string, unknown>(
    (existingLogsRes.data || []).map((r: any) => [r.practice_item_id, r.light_per_unit])
  );

  const nowIso = new Date().toISOString();
  const rows = [];
  for (const log of logs) {
    // 활성 과제가 아니면(삭제/미존재) 기록을 쓰지 않는다.
    if (!currentRateByItem.has(log.practiceItemId)) continue;
    const countNum = Math.max(0, parseInt(log.count, 10) || 0);
    const resolvedRate = pickRate(
      storedByItem.get(log.practiceItemId),
      currentRateByItem.get(log.practiceItemId),
    );
    rows.push({
      user_id: user.id,
      practice_item_id: log.practiceItemId,
      date,
      count: countNum,
      light: computeLight(countNum, resolvedRate),
      light_per_unit: resolvedRate,
      updated_at: nowIso,
    });
  }

  const { error } = await admin
    .from('daily_practice_logs')
    .upsert(rows, { onConflict: 'user_id,practice_item_id,date' });

  if (error) {
    console.error('practice-logs batch PUT error:', error);
    return NextResponse.json({ message: '일괄 저장에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: '저장되었습니다.' });
}
