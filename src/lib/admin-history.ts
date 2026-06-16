// 전체 실천활동 통계(history-detail) 공용 로직
// 어드민 stats 라우트와 export 라우트 양쪽에서 사용하는
// 도반×실천과제×일자 빛 행렬 빌더.

const PAGE_SIZE = 1000;

interface PracticeItemRef {
  name?: string | null;
}

interface PracticeItemHolder {
  user_id: string;
  practice_item_id: string;
  practice_items?: PracticeItemRef | PracticeItemRef[] | null;
}

interface HistoryDetailLog {
  user_id: string;
  date: string;
  light: number | null;
  practice_item_id: string;
  practice_items?: PracticeItemRef | PracticeItemRef[] | null;
}

export interface HistoryDetailMatrix {
  dates: string[];
  userItemsMap: Record<string, string[]>;
  itemNameMap: Record<string, string>;
  matrix: Record<string, Record<string, Record<string, number>>>;
}

function practiceItemName(items: PracticeItemRef | PracticeItemRef[] | null | undefined): string | null {
  if (!items) return null;
  const item = Array.isArray(items) ? items[0] : items;
  return item?.name ?? null;
}

// Supabase 기본 반환 한도(1000행) 때문에 전체 데이터를 가져오려면 페이지네이션 필수
async function fetchHistoryDetailLogs(
  admin: any,
  start?: string | null,
  end?: string | null,
): Promise<HistoryDetailLog[]> {
  const all: HistoryDetailLog[] = [];
  let fromIndex = 0;
  while (true) {
    let query = admin
      .from('daily_practice_logs')
      .select('user_id, date, light, practice_item_id, practice_items(name)')
      .order('date')
      .order('id', { ascending: true });
    if (start) query = query.gte('date', start);
    if (end) query = query.lte('date', end);
    const { data, error } = await query.range(fromIndex, fromIndex + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as HistoryDetailLog[]));
    if (data.length < PAGE_SIZE) break;
    fromIndex += PAGE_SIZE;
  }
  return all;
}

/**
 * 도반×실천과제×일자 빛 행렬을 빌드한다.
 * 노출 과제 = 현재 선택(active) 과제 ∪ 기간 내 로그가 있는 과제.
 * logs 조회와 active 설정 조회는 서로 독립이므로 병렬로 실행한다.
 */
export async function buildHistoryDetailMatrix(
  admin: any,
  start?: string | null,
  end?: string | null,
): Promise<HistoryDetailMatrix> {
  const [logs, settingsRows] = await Promise.all([
    fetchHistoryDetailLogs(admin, start, end),
    admin
      .from('user_practice_settings')
      .select('user_id, practice_item_id, practice_items(name)')
      .eq('is_active', true)
      .then(({ data }: { data: PracticeItemHolder[] | null }) => (data as PracticeItemHolder[]) || []),
  ]);

  const userItemsMap: Record<string, string[]> = {};
  const itemNameMap: Record<string, string> = {};
  for (const s of settingsRows) {
    if (!userItemsMap[s.user_id]) userItemsMap[s.user_id] = [];
    userItemsMap[s.user_id].push(s.practice_item_id);
    const name = practiceItemName(s.practice_items);
    itemNameMap[s.practice_item_id] = name || s.practice_item_id;
  }

  const dateSet = new Set<string>();
  const matrix: Record<string, Record<string, Record<string, number>>> = {};
  for (const log of logs) {
    dateSet.add(log.date);
    const name = practiceItemName(log.practice_items);
    if (name) itemNameMap[log.practice_item_id] = name;
    if (!matrix[log.user_id]) matrix[log.user_id] = {};
    if (!matrix[log.user_id][log.practice_item_id]) matrix[log.user_id][log.practice_item_id] = {};
    const prev = matrix[log.user_id][log.practice_item_id][log.date] || 0;
    matrix[log.user_id][log.practice_item_id][log.date] = parseFloat((prev + (log.light || 0)).toFixed(2));
  }

  return { dates: [...dateSet].sort(), userItemsMap, itemNameMap, matrix };
}
