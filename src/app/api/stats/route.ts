import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';

interface PracticeItemRow {
  id: string;
  name: string;
  description?: string | null;
  light_per_unit?: number | null;
}

interface PracticeLogRow {
  id: string;
  date: string;
  count: number | null;
  light: number | null;
  practice_item_id: string;
  practice_items?: PracticeItemRow | PracticeItemRow[] | null;
}

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * GET /api/stats?type=my|total-light
 *
 * type=my: 나의 빛 통계
 *   query: start, end (YYYY-MM-DD)
 *   response: { dailySummaries, activitySummaries, totalLight, dailyLightGoal, totalLightGoal, achievementRate }
 *
 * type=total-light: 전체 사용자 누적 빛 합계
 *   response: { todayTotalLight, allTimeTotalLight }
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
  const type = searchParams.get('type') || 'my';
  const admin = getSupabaseAdminAny();
  const pageSize = 1000;

  async function fetchAllPracticeLogs(userId: string, start?: string | null, end?: string | null) {
    const allRows: PracticeLogRow[] = [];
    let fromIndex = 0;

    while (true) {
      let query = admin
        .from('daily_practice_logs')
        .select(`
          id, date, count, light, practice_item_id,
          practice_items (id, name, description, light_per_unit)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('id', { ascending: true });

      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);

      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as PracticeLogRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  // ─── 1. 전체 빛 합계 ───────────────────────────────────────────
  if (type === 'total-light') {
    const dateParam = searchParams.get('date');
    const today = dateParam || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    const { data: sums, error: sumsError } = await admin
      .rpc('get_light_sums', { p_user_id: user.id, p_date: today });

    if (sumsError) {
      console.error('get_light_sums error:', sumsError);
      return NextResponse.json({ message: '통계를 불러오는데 실패했습니다.' }, { status: 500 });
    }

    const row = sums?.[0] || sums;
    return NextResponse.json({
      todayTotalLight: parseFloat(Number(row?.today_total_light || 0).toFixed(2)),
      allTimeTotalLight: parseFloat(Number(row?.all_time_total_light || 0).toFixed(2)),
      myTodayLight: parseFloat(Number(row?.my_today_light || 0).toFixed(2)),
      myTotalLight: parseFloat(Number(row?.my_total_light || 0).toFixed(2)),
    });
  }

  // ─── 2. 나의 빛 통계 ───────────────────────────────────────────
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  let logs: PracticeLogRow[] = [];
  try {
    logs = await fetchAllPracticeLogs(user.id, start, end);
  } catch (error) {
    console.error('stats GET error:', error);
    return NextResponse.json({ message: '통계를 불러오는데 실패했습니다.' }, { status: 500 });
  }

  // 일자별 빛 합계
  const dailyMap: Record<string, number> = {};
  // 실천활동별 집계
  const activityMap: Record<string, { name: string; description?: string; count: number; light: number }> = {};

  for (const log of (logs || [])) {
    const dateKey = log.date;
    dailyMap[dateKey] = parseFloat(((dailyMap[dateKey] || 0) + (log.light || 0)).toFixed(2));

    const itemId = log.practice_item_id;
    const practiceItem = Array.isArray(log.practice_items) ? log.practice_items[0] : log.practice_items;
    if (!activityMap[itemId]) {
      activityMap[itemId] = {
        name: practiceItem?.name || '',
        description: practiceItem?.description || undefined,
        count: 0,
        light: 0,
      };
    }
    activityMap[itemId].count += log.count || 0;
    activityMap[itemId].light = parseFloat((activityMap[itemId].light + (log.light || 0)).toFixed(2));
  }

  const dailySummaries = Object.entries(dailyMap).map(([date, totalLight]) => ({ date, totalLight }));
  const activitySummaries = Object.entries(activityMap).map(([practiceItemId, v]) => ({
    practiceItemId,
    practiceItemName: v.name,
    description: v.description,
    totalCount: v.count,
    totalLight: v.light,
  }));

  const totalLight = dailySummaries.reduce((sum, d) => sum + d.totalLight, 0);

  // 목표 조회
  const { data: goal } = await admin
    .from('user_goals')
    .select('daily_light_goal, total_light_goal')
    .eq('user_id', user.id)
    .single();

  const dailyLightGoal = goal?.daily_light_goal || 0;
  const totalLightGoal = goal?.total_light_goal || 0;
  const achievementRate = totalLightGoal > 0 ? parseFloat(((totalLight / totalLightGoal) * 100).toFixed(2)) : 0;

  return NextResponse.json({
    dailySummaries,
    activitySummaries,
    totalLight: parseFloat(totalLight.toFixed(2)),
    dailyLightGoal,
    totalLightGoal,
    achievementRate,
  });
}
