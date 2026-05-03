import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

interface UserRow {
  id: string;
  name?: string | null;
  email?: string | null;
}

interface GoalRow {
  user_id: string;
  daily_light_goal?: number | null;
  total_light_goal?: number | null;
}

interface DailyLightRow {
  user_id: string;
  light: number | null;
}

interface UserPracticeLogRow {
  date: string;
  count: number | null;
  light: number | null;
  practice_item_id: string;
  practice_items?: { name?: string | null; description?: string | null } | { name?: string | null; description?: string | null }[] | null;
}

interface DateLightRow {
  date: string;
  light: number | null;
}

interface HistoryRow {
  user_id: string;
  date: string;
  light: number | null;
}

interface HistoryDetailRow {
  user_id: string;
  date: string;
  light: number | null;
  practice_item_id: string;
  practice_items?: { name?: string | null } | { name?: string | null }[] | null;
}

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function isAdmin(userEmail: string | undefined): boolean {
  return isAdminEmail(userEmail);
}

/**
 * GET /api/admin/stats?type=daily|user|total|history|history-detail
 *
 * type=daily: 사용자별 1일 실천현황
 *   query: date (YYYY-MM-DD)
 *
 * type=user: 특정 사용자 통계
 *   query: userId, start, end
 *
 * type=total: 전체 빛 통계 (일자별)
 *   query: start, end
 *
 * type=history: 전체 역사 통계 (도반×일자 행렬)
 *   query: start, end
 *
 * type=history-detail: 실천활동 전체 통계 (도반×과제×일자)
 *   query: start, end
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });
  if (!isAdmin(user.email)) {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'daily';
  const admin = getSupabaseAdminAny();
  const pageSize = 1000;

  async function fetchAllDailyLightRows(date: string) {
    const allRows: DailyLightRow[] = [];
    let fromIndex = 0;

    while (true) {
      const { data, error } = await admin
        .from('daily_practice_logs')
        .select('user_id, light')
        .eq('date', date)
        .order('id', { ascending: true })
        .range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as DailyLightRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  async function fetchAllUserPracticeLogs(userId: string, start?: string | null, end?: string | null) {
    const allRows: UserPracticeLogRow[] = [];
    let fromIndex = 0;

    while (true) {
      let query = admin
        .from('daily_practice_logs')
        .select('date, count, light, practice_item_id, practice_items(name, description)')
        .eq('user_id', userId)
        .order('date')
        .order('id', { ascending: true });

      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);

      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as UserPracticeLogRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  async function fetchAllDateLightRows(start?: string | null, end?: string | null) {
    const allRows: DateLightRow[] = [];
    let fromIndex = 0;

    while (true) {
      let query = admin
        .from('daily_practice_logs')
        .select('date, light')
        .order('date')
        .order('id', { ascending: true });

      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);

      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as DateLightRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  async function fetchAllHistoryRows(start?: string | null, end?: string | null) {
    const allRows: HistoryRow[] = [];
    let fromIndex = 0;

    while (true) {
      let query = admin
        .from('daily_practice_logs')
        .select('user_id, date, light')
        .order('date')
        .order('id', { ascending: true });

      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);

      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as HistoryRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  async function fetchAllHistoryDetailRows(start?: string | null, end?: string | null) {
    const allRows: HistoryDetailRow[] = [];
    let fromIndex = 0;

    while (true) {
      let query = admin
        .from('daily_practice_logs')
        .select('user_id, date, light, practice_item_id, practice_items(name)')
        .order('date')
        .order('id', { ascending: true });

      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);

      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...(data as HistoryDetailRow[]));
      if (data.length < pageSize) break;

      fromIndex += pageSize;
    }

    return allRows;
  }

  // ─── 사용자 목록 + 목표 조회 공통 함수 ────────────────────────
  async function getUsersWithGoals() {
    const { data: users } = await admin
      .from('users')
      .select('id, name, email')
      .order('name');
    const { data: goals } = await admin
      .from('user_goals')
      .select('user_id, daily_light_goal, total_light_goal');
    const goalMap = new Map<string, GoalRow>((goals as GoalRow[] || []).map((g) => [g.user_id, g]));
    return { users: (users as UserRow[]) || [], goalMap };
  }

  // ─── 1. 사용자별 1일 실천현황 ─────────────────────────────────
  if (type === 'daily') {
    const kstToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const date = searchParams.get('date') || kstToday;
    const { users, goalMap } = await getUsersWithGoals();

    const logs = await fetchAllDailyLightRows(date);

    const userLight: Record<string, number> = {};
    for (const log of (logs || [])) {
      userLight[log.user_id] = parseFloat(((userLight[log.user_id] || 0) + (log.light || 0)).toFixed(2));
    }

    const result = users.map((u) => {
      const goal = goalMap.get(u.id);
      const totalLight = userLight[u.id] || 0;
      const dailyGoal = goal?.daily_light_goal || 0;
      const achievementRate = dailyGoal > 0 ? parseFloat(((totalLight / dailyGoal) * 100).toFixed(2)) : 0;
      return {
        userId: u.id,
        userName: u.name || u.email,
        totalLight,
        dailyLightGoal: dailyGoal,
        achievementRate,
      };
    });

    return NextResponse.json({ date, users: result });
  }

  // ─── 2. 특정 사용자 통계 ──────────────────────────────────────
  if (type === 'user') {
    const targetUserId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (!targetUserId) return NextResponse.json({ message: 'userId가 필요합니다.' }, { status: 400 });

    const logs = await fetchAllUserPracticeLogs(targetUserId, start, end);

    const dailyMap: Record<string, number> = {};
    const activityMap: Record<string, { name: string; description?: string; count: number; light: number }> = {};
    for (const log of (logs || [])) {
      dailyMap[log.date] = parseFloat(((dailyMap[log.date] || 0) + (log.light || 0)).toFixed(2));
      const itemId = log.practice_item_id;
      const practiceItem = Array.isArray(log.practice_items) ? log.practice_items[0] : log.practice_items;
      if (!activityMap[itemId]) {
        activityMap[itemId] = { name: practiceItem?.name || '', description: practiceItem?.description || undefined, count: 0, light: 0 };
      }
      activityMap[itemId].count += log.count || 0;
      activityMap[itemId].light = parseFloat((activityMap[itemId].light + (log.light || 0)).toFixed(2));
    }

    const { data: goal } = await admin.from('user_goals').select('*').eq('user_id', targetUserId).single();
    const { data: userInfo } = await admin.from('users').select('name, email').eq('id', targetUserId).single();

    return NextResponse.json({
      userId: targetUserId,
      userName: (userInfo as UserRow | null)?.name || (userInfo as UserRow | null)?.email,
      dailySummaries: Object.entries(dailyMap).map(([date, totalLight]) => ({ date, totalLight })),
      activitySummaries: Object.entries(activityMap).map(([practiceItemId, v]) => ({
        practiceItemId, practiceItemName: v.name, description: v.description, totalCount: v.count, totalLight: v.light,
      })),
      totalLight: parseFloat(Object.values(dailyMap).reduce((s, v) => s + v, 0).toFixed(2)),
      dailyLightGoal: (goal as GoalRow | null)?.daily_light_goal || 0,
      totalLightGoal: (goal as GoalRow | null)?.total_light_goal || 0,
    });
  }

    // ─── 3. 전체 빛 통계 그래프 ────────────────────────────────────
  if (type === 'total') {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const logs = await fetchAllDateLightRows(start, end);

    const dailyMap: Record<string, number> = {};
    for (const log of (logs || [])) {
      dailyMap[log.date] = parseFloat(((dailyMap[log.date] || 0) + (log.light || 0)).toFixed(2));
    }
    return NextResponse.json(Object.entries(dailyMap).map(([date, totalLight]) => ({ date, totalLight })));
  }

  // ─── 4. 전체 역사 통계 (도반×일자 행렬) ──────────────────────
  if (type === 'history') {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const { users } = await getUsersWithGoals();
    const logs = await fetchAllHistoryRows(start, end);

    // user → date → light
    const matrix: Record<string, Record<string, number>> = {};
    const dateSet = new Set<string>();
    for (const log of (logs || [])) {
      if (!matrix[log.user_id]) matrix[log.user_id] = {};
      matrix[log.user_id][log.date] = parseFloat(((matrix[log.user_id][log.date] || 0) + (log.light || 0)).toFixed(2));
      dateSet.add(log.date);
    }
    const dates = [...dateSet].sort();

    const rows = users.map((u) => ({
      userId: u.id,
      userName: u.name || u.email,
      byDate: Object.fromEntries(dates.map(d => [d, matrix[u.id]?.[d] || 0])),
    }));

    return NextResponse.json({ dates, rows });
  }

  // ─── 5. 전체 실천활동 전체 통계 (도반×과제×일자) ───────────────
  if (type === 'history-detail') {
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const { users } = await getUsersWithGoals();
    const logs = await fetchAllHistoryDetailRows(start, end);

    const dateSet = new Set<string>();
    const itemNameMap: Record<string, string> = {};
    // user → item → date → light
    const matrix: Record<string, Record<string, Record<string, number>>> = {};
    for (const log of (logs || [])) {
      dateSet.add(log.date);
      const practiceItem = Array.isArray(log.practice_items) ? log.practice_items[0] : log.practice_items;
      itemNameMap[log.practice_item_id] = practiceItem?.name || log.practice_item_id;
      if (!matrix[log.user_id]) matrix[log.user_id] = {};
      if (!matrix[log.user_id][log.practice_item_id]) matrix[log.user_id][log.practice_item_id] = {};
      const prev = matrix[log.user_id][log.practice_item_id][log.date] || 0;
      matrix[log.user_id][log.practice_item_id][log.date] = parseFloat((prev + (log.light || 0)).toFixed(2));
    }
    const dates = [...dateSet].sort();
    const itemIds = Object.keys(itemNameMap);

    const rows = [];
    for (const u of users) {
      for (const itemId of itemIds) {
        rows.push({
          userId: u.id,
          userName: u.name || u.email,
          practiceItemId: itemId,
          practiceItemName: itemNameMap[itemId],
          byDate: Object.fromEntries(dates.map(d => [d, matrix[u.id]?.[itemId]?.[d] || 0])),
        });
      }
    }

    return NextResponse.json({ dates, itemNames: itemNameMap, rows });
  }

  return NextResponse.json({ message: '지원하지 않는 type입니다.' }, { status: 400 });
}
