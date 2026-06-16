import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/admin';
import { sanitizeFilenamePart } from '@/lib/utils';
import { buildHistoryDetailMatrix } from '@/lib/admin-history';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function isAdmin(userEmail: string | undefined): boolean {
  return isAdminEmail(userEmail);
}

type CSVValue = string | number | null | undefined;

interface UserExportInfo {
  name?: string | null;
  email?: string | null;
}

interface UserPracticeLogExportRow {
  date: string;
  count: number | null;
  light: number | null;
  practice_item_id: string;
  practice_items?: { name?: string | null } | { name?: string | null }[] | null;
}

function escapeCSVValue(v: CSVValue): string {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
}

function toCSVRows(rows: CSVValue[][]): string {
  // BOM for Excel Korean support
  return '\uFEFF' + rows.map(row => row.map(escapeCSVValue).join(',')).join('\r\n');
}

function toCSV(headers: string[], rows: CSVValue[][]): string {
  return toCSVRows([headers, ...rows]);
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
  const pageSize = 1000;

  // Supabase 기본 반환 한도(1000행) 때문에 전체 데이터를 가져오려면 페이지네이션 필수
  async function fetchAll<T = any>(
    base: () => any,
    start?: string,
    end?: string,
  ): Promise<T[]> {
    const all: T[] = [];
    let fromIndex = 0;
    while (true) {
      let query = base();
      if (start) query = query.gte('date', start);
      if (end) query = query.lte('date', end);
      const { data, error } = await query.range(fromIndex, fromIndex + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...(data as T[]));
      if (data.length < pageSize) break;
      fromIndex += pageSize;
    }
    return all;
  }

  let csvContent = '';
  let filename = 'export.csv';

  // ─── daily: 사용자별 1일 실천현황 ──────────────────────────────
  if (type === 'daily') {
    const kstToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const date = searchParams.get('date') || kstToday;
    const { data: users } = await admin.from('users').select('id, name, email');
    const { data: goals } = await admin.from('user_goals').select('user_id, daily_light_goal');
    const logs = await fetchAll(() =>
      admin.from('daily_practice_logs').select('user_id, light').eq('date', date).order('id', { ascending: true }),
    );

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
    if (!targetUserId) return NextResponse.json({ message: 'userId가 필요합니다.' }, { status: 400 });

    const { data: userInfo } = await admin.from('users').select('name, email').eq('id', targetUserId).single();
    const typedUserInfo = userInfo as UserExportInfo | null;
    const userName = typedUserInfo?.name || typedUserInfo?.email || '도반';

    const logs = await fetchAll<UserPracticeLogExportRow>(() =>
      admin
        .from('daily_practice_logs')
        .select(`date, count, light, practice_item_id, practice_items(name)`)
        .eq('user_id', targetUserId)
        .order('date')
        .order('id', { ascending: true }),
      start || undefined, end_ || undefined,
    );

    const rowMap: Record<string, { date: string; practiceItemName: string; count: number; light: number }> = {};
    for (const log of (logs || [])) {
      const practiceItem = Array.isArray(log.practice_items) ? log.practice_items[0] : log.practice_items;
      const practiceItemName = practiceItem?.name || '';
      const key = `${log.date}__${log.practice_item_id}`;
      if (!rowMap[key]) {
        rowMap[key] = { date: log.date, practiceItemName, count: 0, light: 0 };
      }
      rowMap[key].count += log.count || 0;
      rowMap[key].light = parseFloat((rowMap[key].light + (log.light || 0)).toFixed(2));
    }

    const rows = Object.values(rowMap).sort((a, b) => (
      a.date.localeCompare(b.date) || a.practiceItemName.localeCompare(b.practiceItemName)
    ));
    const totalLight = parseFloat(rows.reduce((sum, row) => sum + row.light, 0).toFixed(2));

    csvContent = toCSVRows([
      ['일자', '실천활동', '횟수', '빛'],
      ...rows.map(row => [row.date, row.practiceItemName, row.count, row.light]),
      ['합계', '', '', totalLight],
    ]);
    filename = `사용자통계_${start || 'all'}_${sanitizeFilenamePart(userName)}_${end_}.csv`;
  }

  // ─── total: 전체 빛 통계 ─────────────────────────────────────
  else if (type === 'total') {
    const start = searchParams.get('start') || '';
    const end_ = searchParams.get('end') || '';
    const logs = await fetchAll(() =>
      admin.from('daily_practice_logs').select('date, light').order('date').order('id', { ascending: true }),
      start || undefined, end_ || undefined,
    );

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
    const logs = await fetchAll(() =>
      admin.from('daily_practice_logs').select('user_id, date, light').order('date').order('id', { ascending: true }),
      start || undefined, end_ || undefined,
    );

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
    const { dates, userItemsMap, itemNameMap, matrix } = await buildHistoryDetailMatrix(admin, start || undefined, end_ || undefined);

    const headers = ['이름', '실천활동', ...dates];
    const rows: (string | number)[][] = [];
    for (const u of (users || [])) {
      // 현재 선택한 과제 ∪ 기간 내 로그가 있는 과제
      const itemIdSet = new Set<string>(userItemsMap[(u as any).id] || []);
      const logged = matrix[(u as any).id] ? Object.keys(matrix[(u as any).id]) : [];
      for (const id of logged) itemIdSet.add(id);
      const itemIds = [...itemIdSet];
      for (const itemId of itemIds) {
        rows.push([
          (u as any).name || (u as any).email,
          itemNameMap[itemId] || itemId,
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
