import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function isAdmin(userEmail: string | undefined): boolean {
  return isAdminEmail(userEmail);
}

function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  // BOM for Excel Korean support
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * GET /api/admin/export?type=daily|user|total|history|history-detail&...
 * CSV 다운로드
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

  let csvContent = '';
  let filename = 'export.csv';

  // ─── daily: 사용자별 1일 실천현황 ──────────────────────────────
  if (type === 'daily') {
    const kstToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const date = searchParams.get('date') || kstToday;
    const { data: users } = await admin.from('users').select('id, name, email');
    const { data: goals } = await admin.from('user_goals').select('user_id, daily_light_goal');
    const { data: logs } = await admin.from('daily_practice_logs').select('user_id, light').eq('date', date);

    const goalMap = new Map<string, number>((goals || []).map((g: any) => [g.user_id, Number(g.daily_light_goal) || 0]));
    const lightMap: Record<string, number> = {};
    for (const log of (logs || [])) {
      lightMap[log.user_id] = parseFloat(((lightMap[log.user_id] || 0) + (log.light || 0)).toFixed(2));
    }

    const headers = ['이름', '빛', '목표', '달성율(%)'];
    const rows = (users || []).map((u: any) => {
      const light = lightMap[u.id] || 0;
      const goal = goalMap.get(u.id) || 0;
      const rate = goal > 0 ? parseFloat(((light / goal) * 100).toFixed(2)) : 0;
      return [u.name || u.email, light, goal, rate];
    });
    csvContent = toCSV(headers, rows);
    filename = `일일현황_${date}.csv`;
  }

  // ─── user: 특정 사용자 통계 ────────────────────────────────────
  else if (type === 'user') {
    const targetUserId = searchParams.get('userId') || '';
    const start = searchParams.get('start') || '';
    const end_ = searchParams.get('end') || '';

    let query = admin
      .from('daily_practice_logs')
      .select(`date, count, light, practice_item_id, practice_items(name)`)
      .eq('user_id', targetUserId)
      .order('date');
    if (start) query = query.gte('date', start);
    if (end_) query = query.lte('date', end_);
    const { data: logs } = await query;

    const activityMap: Record<string, { name: string; count: number; light: number }> = {};
    for (const log of (logs || [])) {
      const id = log.practice_item_id;
      if (!activityMap[id]) activityMap[id] = { name: (log as any).practice_items?.name || '', count: 0, light: 0 };
      activityMap[id].count += log.count || 0;
      activityMap[id].light = parseFloat((activityMap[id].light + (log.light || 0)).toFixed(2));
    }

    const headers = ['실천활동', '횟수', '빛'];
    const rows = Object.values(activityMap).map(v => [v.name, v.count, v.light]);
    csvContent = toCSV(headers, rows);
    filename = `사용자통계_${start}_${end_}.csv`;
  }

  // ─── total: 전체 빛 통계 ─────────────────────────────────────
  else if (type === 'total') {
    const start = searchParams.get('start') || '';
    const end_ = searchParams.get('end') || '';
    let query = admin.from('daily_practice_logs').select('date, light').order('date');
    if (start) query = query.gte('date', start);
    if (end_) query = query.lte('date', end_);
    const { data: logs } = await query;

    const dailyMap: Record<string, number> = {};
    for (const log of (logs || [])) {
      dailyMap[log.date] = parseFloat(((dailyMap[log.date] || 0) + (log.light || 0)).toFixed(2));
    }
    const headers = ['일자', '빛'];
    const rows = Object.entries(dailyMap).map(([date, light]) => [date, light]);
    csvContent = toCSV(headers, rows);
    filename = `전체통계_${start}_${end_}.csv`;
  }

  // ─── history: 전체 역사 통계 행렬 ──────────────────────────────
  else if (type === 'history') {
    const start = searchParams.get('start') || '';
    const end_ = searchParams.get('end') || '';
    const { data: users } = await admin.from('users').select('id, name, email').order('name');
    let query = admin.from('daily_practice_logs').select('user_id, date, light').order('date');
    if (start) query = query.gte('date', start);
    if (end_) query = query.lte('date', end_);
    const { data: logs } = await query;

    const dateSet = new Set<string>();
    const matrix: Record<string, Record<string, number>> = {};
    for (const log of (logs || [])) {
      dateSet.add(log.date);
      if (!matrix[log.user_id]) matrix[log.user_id] = {};
      const prev = matrix[log.user_id][log.date] || 0;
      matrix[log.user_id][log.date] = parseFloat((prev + (log.light || 0)).toFixed(2));
    }
    const dates = [...dateSet].sort();
    const headers = ['이름', ...dates];
    const rows = (users || []).map((u: any) => [
      u.name || u.email,
      ...dates.map(d => matrix[u.id]?.[d] || 0),
    ]);
    csvContent = toCSV(headers, rows);
    filename = `전체역사통계_${start}_${end_}.csv`;
  }

  // ─── history-detail: 전체 실천활동 통계 행렬 ───────────────────
  else if (type === 'history-detail') {
    const start = searchParams.get('start') || '';
    const end_ = searchParams.get('end') || '';
    const { data: users } = await admin.from('users').select('id, name, email').order('name');
    let query = admin
      .from('daily_practice_logs')
      .select(`user_id, date, light, practice_item_id, practice_items(name)`)
      .order('date');
    if (start) query = query.gte('date', start);
    if (end_) query = query.lte('date', end_);
    const { data: logs } = await query;

    const dateSet = new Set<string>();
    const itemNameMap: Record<string, string> = {};
    const matrix: Record<string, Record<string, Record<string, number>>> = {};
    for (const log of (logs || [])) {
      dateSet.add(log.date);
      itemNameMap[log.practice_item_id] = (log as any).practice_items?.name || log.practice_item_id;
      if (!matrix[log.user_id]) matrix[log.user_id] = {};
      if (!matrix[log.user_id][log.practice_item_id]) matrix[log.user_id][log.practice_item_id] = {};
      const prev = matrix[log.user_id][log.practice_item_id][log.date] || 0;
      matrix[log.user_id][log.practice_item_id][log.date] = parseFloat((prev + (log.light || 0)).toFixed(2));
    }
    const dates = [...dateSet].sort();
    const itemIds = Object.keys(itemNameMap);

    const headers = ['이름', '실천활동', ...dates];
    const rows: (string | number)[][] = [];
    for (const u of (users || [])) {
      for (const itemId of itemIds) {
        rows.push([
          (u as any).name || (u as any).email,
          itemNameMap[itemId],
          ...dates.map(d => matrix[(u as any).id]?.[itemId]?.[d] || 0),
        ]);
      }
    }
    csvContent = toCSV(headers, rows);
    filename = `전체실천활동통계_${start}_${end_}.csv`;
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
