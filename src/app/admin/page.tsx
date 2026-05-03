'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Shield, ArrowLeft, CheckCircle, Copy, AlertTriangle, Download, BarChart2, TrendingUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, subMonths } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Event, PersonalEvent } from '@/types/training';

interface ResetResult { email: string; name?: string; temporaryPassword: string; note?: string; }
interface UserData {
  id: string; email: string; name: string; createdAt: string;
  lastSignInAt?: string; resetRequested: boolean; accountLocked: boolean; failedAttempts: number;
}

type PeriodType = 'week' | 'month' | 'all';
type ChartType = 'bar' | 'line';

function ChartTypeToggle({ value, onChange }: { value: ChartType; onChange: (v: ChartType) => void }) {
  return (
    <div className="flex gap-1">
      <Button variant={value === 'bar' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => onChange('bar')}>
        <BarChart2 className="w-4 h-4" />
      </Button>
      <Button variant={value === 'line' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => onChange('line')}>
        <TrendingUp className="w-4 h-4" />
      </Button>
    </div>
  );
}

function PeriodSelect({ value, onChange }: { value: PeriodType; onChange: (v: PeriodType) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodType)}>
      <SelectTrigger className="w-[90px] h-8 text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="week">일주일</SelectItem>
        <SelectItem value="month">한달</SelectItem>
        <SelectItem value="all">전체</SelectItem>
      </SelectContent>
    </Select>
  );
}

function getDateRange(period: PeriodType) {
  const now = new Date();
  const end = format(now, 'yyyy-MM-dd');
  let start: string | undefined;
  if (period === 'week') start = format(subDays(now, 6), 'yyyy-MM-dd');
  else if (period === 'month') start = format(subMonths(now, 1), 'yyyy-MM-dd');
  return { start, end };
}

function SimpleChart({ data, chartType }: { data: { date: string; totalLight: number }[]; chartType: ChartType }) {
  const formatted = data.map(d => ({ date: d.date.slice(5), 빛: d.totalLight }));
  if (formatted.length === 0) return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">기간 내 데이터가 없습니다.</div>;
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [`${v}빛`, '빛']} />
            <Bar dataKey="빛" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => [`${v}빛`, '빛']} />
            <Line type="monotone" dataKey="빛" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

async function downloadExport(type: string, params: Record<string, string>, filename: string) {
  try {
    const resp = await api.downloadAdminExport(type, params);
    const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('다운로드에 실패했습니다.');
  }
}

// ──────────────────────────────────────
// Tab: ⑯ 사용자별 1일 실천현황
// ──────────────────────────────────────
function DailyTab({ users }: { users: UserData[] }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try { const d = await api.getAdminDailyStats(date); setData(d.users || []); }
    catch { toast.error('데이터 조회 실패'); }
    finally { setIsLoading(false); }
  }, [date]);

  useEffect(() => { fetch(); }, [fetch]);

  const sortedData = [...data].sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
  const totalLightSum = sortedData.reduce((sum, row) => sum + (row.totalLight || 0), 0);
  const totalGoalSum = sortedData.reduce((sum, row) => sum + (row.dailyLightGoal || 0), 0);
  const totalAchievementRate = totalGoalSum > 0
    ? parseFloat(((totalLightSum / totalGoalSum) * 100).toFixed(2))
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        <Button variant="outline" size="sm" onClick={fetch}>조회</Button>
        <Button variant="outline" size="sm" className="gap-1 ml-auto"
          onClick={() => downloadExport('daily', { date }, `일일현황_${date}.csv`)}>
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm min-w-[400px]">
          <thead><tr className="bg-muted/50">
            <th className="text-left px-3 py-2">이름</th>
            <th className="text-right px-3 py-2">빛</th>
            <th className="text-right px-3 py-2">목표</th>
            <th className="text-right px-3 py-2">달성율</th>
          </tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">로딩 중...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">데이터가 없습니다.</td></tr>
            ) : (
              <>
                {sortedData.map((row: any) => (
                  <tr key={row.userId} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.userName}</td>
                    <td className="text-right px-3 py-2">{row.totalLight}</td>
                    <td className="text-right px-3 py-2">{row.dailyLightGoal || '-'}</td>
                    <td className="text-right px-3 py-2">{row.achievementRate > 0 ? `${row.achievementRate}%` : '-'}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td className="px-3 py-2">합계</td>
                  <td className="text-right px-3 py-2">{parseFloat(totalLightSum.toFixed(2))}</td>
                  <td className="text-right px-3 py-2">{totalGoalSum > 0 ? parseFloat(totalGoalSum.toFixed(2)) : '-'}</td>
                  <td className="text-right px-3 py-2">{totalAchievementRate > 0 ? `${totalAchievementRate}%` : '-'}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Tab: ⑰ 노원지원 빛 통계 (전체 일자별)
// ──────────────────────────────────────
function TotalLightTab() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    const { start, end } = getDateRange(period);
    setIsLoading(true);
    try { const d = await api.getAdminTotalStats(start, end); setData(d || []); }
    catch { toast.error('데이터 조회 실패'); }
    finally { setIsLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  const { start, end } = getDateRange(period);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <PeriodSelect value={period} onChange={setPeriod} />
        <ChartTypeToggle value={chartType} onChange={setChartType} />
        <Button variant="outline" size="sm" className="gap-1 ml-auto"
          onClick={() => downloadExport('total', { start: start || '', end }, `전체통계_${start||'all'}_${end}.csv`)}>
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>
      {isLoading ? <div className="h-48 flex items-center justify-center text-muted-foreground">로딩 중...</div>
        : <SimpleChart data={data} chartType={chartType} />}
    </div>
  );
}

// ──────────────────────────────────────
// Tab: ⑱ 도반별 빛 통계
// ──────────────────────────────────────
function UserLightTab({ users }: { users: UserData[] }) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!selectedUserId) return;
    const { start, end } = getDateRange(period);
    setIsLoading(true);
    try { const d = await api.getAdminUserStats(selectedUserId, start, end); setData(d); }
    catch { toast.error('데이터 조회 실패'); }
    finally { setIsLoading(false); }
  }, [selectedUserId, period]);

  useEffect(() => { if (selectedUserId) fetch(); }, [selectedUserId, period, fetch]);

  const { start, end } = getDateRange(period);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="도반 선택" /></SelectTrigger>
          <SelectContent>
            {[...users].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)).map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <PeriodSelect value={period} onChange={setPeriod} />
        <ChartTypeToggle value={chartType} onChange={setChartType} />
        {selectedUserId && (
          <Button variant="outline" size="sm" className="gap-1 ml-auto"
            onClick={() => downloadExport('user', { userId: selectedUserId, start: start || '', end }, `사용자통계_${start||'all'}_${end}.csv`)}>
            <Download className="w-4 h-4" /> CSV
          </Button>
        )}
      </div>
      {isLoading ? <div className="h-48 flex items-center justify-center text-muted-foreground">로딩 중...</div>
        : data ? (
          <>
            <SimpleChart data={data.dailySummaries || []} chartType={chartType} />
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50">
                  <th className="text-left px-3 py-2">실천활동</th>
                  <th className="text-right px-3 py-2">횟수</th>
                  <th className="text-right px-3 py-2">빛</th>
                </tr></thead>
                <tbody>
                  {(data.activitySummaries || []).map((a: any) => (
                    <tr key={a.practiceItemId} className="border-t">
                      <td className="px-3 py-2">{a.practiceItemName}</td>
                      <td className="text-right px-3 py-2">{a.totalCount}</td>
                      <td className="text-right px-3 py-2 font-semibold">{a.totalLight}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="px-3 py-2">검색기간 빛</td>
                    <td className="text-right px-3 py-2">—</td>
                    <td className="text-right px-3 py-2 text-yellow-600">{data.totalLight}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : <div className="text-center text-muted-foreground py-8">도반을 선택해주세요.</div>}
    </div>
  );
}

// ──────────────────────────────────────
// Tab: ⑲ 전체 역사 통계 (도반×일자 행렬)
// ──────────────────────────────────────
function HistoryTab() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    const { start, end } = getDateRange(period);
    setIsLoading(true);
    try { const d = await api.getAdminHistoryStats(start, end); setData(d); }
    catch { toast.error('데이터 조회 실패'); }
    finally { setIsLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  const { start, end } = getDateRange(period);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <PeriodSelect value={period} onChange={setPeriod} />
        <Button variant="outline" size="sm" className="gap-1 ml-auto"
          onClick={() => downloadExport('history', { start: start || '', end }, `전체역사통계_${start||'all'}_${end}.csv`)}>
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
        : data && data.dates?.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="text-sm min-w-full">
              <thead><tr className="bg-muted/50">
                <th className="text-left px-3 py-2 sticky left-0 bg-muted/80">도반</th>
                {data.dates.map((d: string) => (
                  <th key={d} className="text-right px-2 py-2 whitespace-nowrap font-medium">{d.slice(5)}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...(data.rows || [])].sort((a, b) => (a.userName || '').localeCompare(b.userName || '')).map((row: any) => (
                  <tr key={row.userId} className="border-t">
                    <td className="px-3 py-2 font-medium sticky left-0 bg-background">{row.userName}</td>
                    {data.dates.map((d: string) => (
                      <td key={d} className="text-right px-2 py-2">{row.byDate[d] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="text-center text-muted-foreground py-8">데이터가 없습니다.</div>}
    </div>
  );
}

// ──────────────────────────────────────
// Tab: ⑳ 실천활동 전체 통계 (도반×과제×일자)
// ──────────────────────────────────────
function HistoryDetailTab() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    const { start, end } = getDateRange(period);
    setIsLoading(true);
    try { const d = await api.getAdminHistoryDetailStats(start, end); setData(d); }
    catch { toast.error('데이터 조회 실패'); }
    finally { setIsLoading(false); }
  }, [period]);

  useEffect(() => { fetch(); }, [fetch]);

  const { start, end } = getDateRange(period);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <PeriodSelect value={period} onChange={setPeriod} />
        <Button variant="outline" size="sm" className="gap-1 ml-auto"
          onClick={() => downloadExport('history-detail', { start: start || '', end }, `전체실천활동통계_${start||'all'}_${end}.csv`)}>
          <Download className="w-4 h-4" /> CSV
        </Button>
      </div>
      {isLoading ? <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
        : data && data.dates?.length > 0 ? (
          <div className="border rounded-lg overflow-auto">
            <table className="text-sm min-w-full">
              <thead><tr className="bg-muted/50">
                <th className="text-left px-3 py-2 sticky left-0 bg-muted/80 whitespace-nowrap">도반</th>
                <th className="text-left px-3 py-2 whitespace-nowrap">실천활동</th>
                {data.dates.map((d: string) => (
                  <th key={d} className="text-right px-2 py-2 whitespace-nowrap font-medium">{d.slice(5)}</th>
                ))}
              </tr></thead>
              <tbody>
                {[...(data.rows || [])]
                  .sort((a, b) => {
                    const nameCmp = (a.userName || '').localeCompare(b.userName || '');
                    if (nameCmp !== 0) return nameCmp;
                    return (a.practiceItemName || '').localeCompare(b.practiceItemName || '');
                  })
                  .map((row: any, i: number, arr: any[]) => (
                  <tr key={`${row.userId}-${row.practiceItemId}`} className={`border-t ${i > 0 && arr[i-1].userId !== row.userId ? 'border-t-2 border-primary/30' : ''}`}>
                    <td className="px-3 py-2 font-medium sticky left-0 bg-background">{row.userName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.practiceItemName}</td>
                    {data.dates.map((d: string) => (
                      <td key={d} className="text-right px-2 py-2">{row.byDate[d] || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="text-center text-muted-foreground py-8">데이터가 없습니다.</div>}
    </div>
  );
}

// ──────────────────────────────────────
// Tab: 개인 이벤트 관리
// ──────────────────────────────────────
const PREDEFINED_BOUQUETS = [
  '/images/bouquets/bouquet-1.png',
  '/images/bouquets/bouquet-2.png',
  '/images/bouquets/bouquet-3.png'
];

function PersonalEventTab({ users }: { users: UserData[] }) {
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [lightThreshold, setLightThreshold] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    try { const d = await api.getPersonalEvents(); setEvents(d || []); }
    catch { toast.error('개인 이벤트 목록 조회 실패'); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    if (!selectedUserId || !name.trim() || !lightThreshold) {
      toast.error('사용자, 이름, 빛 수를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const randomBouquet = PREDEFINED_BOUQUETS[Math.floor(Math.random() * PREDEFINED_BOUQUETS.length)];
      await api.createPersonalEvent({
        userId: selectedUserId,
        userName: getUserName(selectedUserId),
        name: name.trim(),
        lightThreshold: parseFloat(lightThreshold),
        bouquetImageUrl: randomBouquet,
      });
      toast.success('개인 이벤트가 등록되었습니다.');
      setName(''); setLightThreshold('');
      await fetchEvents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '등록에 실패했습니다.');
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 이벤트를 삭제하시겠습니까?')) return;
    try {
      await api.deletePersonalEvent(id);
      toast.success('삭제되었습니다.');
      await fetchEvents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const getUserName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    return u?.name || u?.email || userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* 등록 */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">개인 이벤트 설정</p>
        <div className="space-y-2">
          <div className="flex gap-2 items-end flex-wrap">
            <div className="w-40 space-y-1">
              <p className="text-xs text-muted-foreground">대상 도반</p>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="도반 선택" /></SelectTrigger>
                <SelectContent>
                  {[...users].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-36 space-y-1">
              <p className="text-xs text-muted-foreground">이벤트 이름</p>
              <Input
                placeholder="예: 나의 100빛 달성"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="w-32 space-y-1">
              <p className="text-xs text-muted-foreground">빛 수 (목표)</p>
              <Input
                type="number"
                placeholder="예: 100"
                value={lightThreshold}
                onChange={e => setLightThreshold(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={isLoading}>저장</Button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-sm font-semibold text-muted-foreground">개인 이벤트 리스트</div>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">등록된 개인 이벤트가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2">대상</th>
              <th className="text-left px-3 py-2">이름</th>
              <th className="text-right px-3 py-2">목표 빛</th>
              <th className="text-right px-3 py-2">달성 여부</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{getUserName(e.userId)}</td>
                  <td className="px-3 py-2">{e.name}</td>
                  <td className="text-right px-3 py-2 text-amber-600 font-bold">{e.lightThreshold.toLocaleString()}빛</td>
                  <td className="text-right px-3 py-2">
                    {e.achievedAt
                      ? <span className="text-green-600 font-semibold">달성 ({new Date(e.achievedAt).toLocaleDateString()})</span>
                      : <span className="text-muted-foreground">진행 중</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Tab: 이벤트 관리
// ──────────────────────────────────────
function EventTab() {
  const [events, setEvents] = useState<Event[]>([]);
  const [name, setName] = useState('');
  const [lightThreshold, setLightThreshold] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    try { const d = await api.getEvents(); setEvents(d || []); }
    catch { toast.error('이벤트 목록 조회 실패'); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    if (!name.trim() || !lightThreshold) { toast.error('이름과 빛 수를 입력해주세요.'); return; }
    setIsLoading(true);
    try {
      await api.createEvent(name.trim(), parseFloat(lightThreshold));
      toast.success('이벤트가 등록되었습니다.');
      setName(''); setLightThreshold('');
      await fetchEvents();
    } catch (error: any) { 
      toast.error(error?.response?.data?.message || '등록에 실패했습니다.'); 
    }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이벤트를 삭제하면 당첨 정보도 함께 삭제됩니다. 계속하시겠습니까?')) return;
    try {
      await api.deleteEvent(id);
      toast.success('삭제되었습니다.');
      await fetchEvents();
    } catch (error: any) { 
      toast.error(error?.response?.data?.message || '삭제에 실패했습니다.'); 
    }
  };

  return (
    <div className="space-y-6">
      {/* 등록 */}
      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">이벤트 설정</p>
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-36 space-y-1">
            <p className="text-xs text-muted-foreground">이벤트 이름</p>
            <Input
              placeholder="예: 노원지원 500빛 달성"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="w-32 space-y-1">
            <p className="text-xs text-muted-foreground">빛 수 (기준)</p>
            <Input
              type="number"
              placeholder="예: 500"
              value={lightThreshold}
              onChange={e => setLightThreshold(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <Button onClick={handleCreate} disabled={isLoading}>저장</Button>
        </div>
      </div>

      {/* 목록 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-sm font-semibold text-muted-foreground">이벤트 리스트</div>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">등록된 이벤트가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left px-3 py-2">이름</th>
              <th className="text-right px-3 py-2">빛 수</th>
              <th className="text-right px-3 py-2">당첨자</th>
              <th className="px-3 py-2"></th>
            </tr></thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{e.name}</td>
                  <td className="text-right px-3 py-2 text-amber-600 font-bold">{e.lightThreshold.toLocaleString()}빛</td>
                  <td className="text-right px-3 py-2">
                    {e.winnerUserName
                      ? <span className="text-green-600 font-semibold">{e.winnerUserName}</span>
                      : <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Main Admin Page
// ──────────────────────────────────────
function AdminPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const isAdmin = user?.isAdmin || false;

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await api.getUsers();
      if (response?.users) setUsers(response.users);
    } catch (error) { console.error('Failed to fetch users:', error); }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resetRequestedUsers = users.filter(u => u.resetRequested || u.accountLocked);
  const hasRequests = resetRequestedUsers.length > 0;
  const prevHasRequests = useRef(hasRequests);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // 처음 사용자 데이터를 불러왔을 때 요청이 있으면(1회만) password 탭으로 이동
    if (isFirstLoad.current && users.length > 0) {
      if (hasRequests) {
        setActiveTab('password');
      }
      isFirstLoad.current = false;
    }

    // 방금 전까지 요청이 있다가 방금 모두 처리된 경우(0이 됨) 1일 현황 탭으로 자동 이동
    if (prevHasRequests.current && !hasRequests && activeTab === 'password') {
      setActiveTab('daily');
    }
    prevHasRequests.current = hasRequests;
  }, [users.length, hasRequests, activeTab]);

  const handleResetPassword = async (email: string) => {
    const user_ = users.find(u => u.email === email);
    const needsConfirm = !user_?.resetRequested && !user_?.accountLocked;
    if (needsConfirm) {
      setPendingEmail(email);
      setShowConfirmDialog(true);
      return;
    }
    // 요청이 있거나 잠금 계정은 바로 confirm=true로 초기화
    await doReset(email, true);
  };

  const doReset = async (email: string, confirm = true) => {
    setIsLoading(true);
    try {
      const res = await api.adminResetPassword(email, confirm);
      if (res?.temporaryPassword) {
        // 이름 찾기
        const targetUser = users.find(u => u.email === email);
        setResetResult({ ...res, name: targetUser?.name });
        toast.success('비밀번호가 재설정되었습니다.');
      } else {
        toast.error(res?.message || '비밀번호 재설정에 실패했습니다.');
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '비밀번호 재설정에 실패했습니다.');
    } finally { setIsLoading(false); }
  };

  if (!isAdmin) { return <div className="container mx-auto px-4 py-8 text-center">관리자 권한이 필요합니다.</div>; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <h1 className="text-3xl font-bold">관리자 페이지</h1>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-muted-foreground">
            이름: {user?.name} · 전화번호: {user?.email}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex h-auto max-w-full overflow-x-auto overflow-y-hidden justify-start gap-1 pb-1 w-full snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&>button]:shrink-0">
            <TabsTrigger value="daily">1일 현황</TabsTrigger>
            <TabsTrigger value="total">전체 통계</TabsTrigger>
            <TabsTrigger value="user">도반별</TabsTrigger>
            <TabsTrigger value="history">역사 통계</TabsTrigger>
            <TabsTrigger value="history-detail">전체 실천활동</TabsTrigger>
            <TabsTrigger value="personal-events">개인 이벤트</TabsTrigger>
            <TabsTrigger value="events">이벤트</TabsTrigger>
            <TabsTrigger value="password" className="relative">
              <div className="flex items-center justify-center gap-1.5">
                <span>비밀번호 관리</span>
                <span className={`shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold w-5 h-5 ${hasRequests ? 'inline-flex' : 'hidden'}`}>
                  {resetRequestedUsers.length}
                </span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* ⑯ 1일 현황 */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle>사용자별 1일 실천현황</CardTitle>
                <CardDescription>날짜를 선택하면 해당 일의 도반별 빛 및 목표 달성율을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent><DailyTab users={users} /></CardContent>
            </Card>
          </TabsContent>

          {/* ⑰ 전체 빛 통계 */}
          <TabsContent value="total">
            <Card>
              <CardHeader>
                <CardTitle>노원지원 빛 모으기 역사 통계</CardTitle>
                <CardDescription>전체 도반의 기간별 빛 합계 그래프입니다.</CardDescription>
              </CardHeader>
              <CardContent><TotalLightTab /></CardContent>
            </Card>
          </TabsContent>

          {/* ⑱ 도반별 통계 */}
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>도반별 빛 모으기 역사 통계</CardTitle>
                <CardDescription>특정 도반의 기간별 실천 통계를 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent><UserLightTab users={users} /></CardContent>
            </Card>
          </TabsContent>

          {/* ⑲ 전체 역사 통계 */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>노원지원 빛 모으기 역사 및 전체 통계</CardTitle>
                <CardDescription>도반 × 일자 행렬로 기간별 빛 현황을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent><HistoryTab /></CardContent>
            </Card>
          </TabsContent>

          {/* ⑳ 실천활동 전체 통계 */}
          <TabsContent value="history-detail">
            <Card>
              <CardHeader>
                <CardTitle>노원지원 빛 모으기 역사 실천활동 전체 통계</CardTitle>
                <CardDescription>도반 × 실천활동 × 일자 행렬로 상세 통계를 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent><HistoryDetailTab /></CardContent>
            </Card>
          </TabsContent>

          {/* 개인 이벤트 관리 */}
          <TabsContent value="personal-events">
            <Card>
              <CardHeader>
                <CardTitle>개인 이벤트 관리</CardTitle>
                <CardDescription>도반별 개인 빛 수 달성 이벤트를 등록하고 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent><PersonalEventTab users={users} /></CardContent>
            </Card>
          </TabsContent>

          {/* 이벤트 관리 */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>이벤트 관리</CardTitle>
                <CardDescription>빛 수 달성 이벤트를 등록하고 관리합니다. 처음으로 기준 빛 수를 달성한 도반이 당첨자로 선정됩니다.</CardDescription>
              </CardHeader>
              <CardContent><EventTab /></CardContent>
            </Card>
          </TabsContent>

          {/* 비밀번호 관리 (기존 유지) */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>비밀번호 관리</CardTitle>
                <CardDescription>비밀번호 초기화 요청 및 잠금 계정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {resetRequestedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>처리가 필요한 요청이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resetRequestedUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{u.name || u.email}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          {u.accountLocked && (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> 잠금 계정
                            </span>
                          )}
                          {u.resetRequested && !u.accountLocked && (
                            <span className="text-xs text-orange-500">초기화 요청</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPassword(u.email)}
                          disabled={isLoading}
                        >
                          비밀번호 초기화
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* resetResult는 탭 외부 다이얼로그로 이동 */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 비밀번호 재설정 결과 다이얼로그 */}
      <Dialog open={!!resetResult} onOpenChange={(open) => { if (!open) { setResetResult(null); fetchUsers(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              비밀번호 재설정 완료
            </DialogTitle>
            <DialogDescription>
              아래 임시 비밀번호를 해당 사용자에게 알려주세요.
            </DialogDescription>
          </DialogHeader>
          {resetResult && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                {resetResult.name && (
                  <div>
                    <p className="text-xs text-muted-foreground">이름</p>
                    <p className="font-medium">{resetResult.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">아이디</p>
                  <p className="font-medium">{resetResult.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">임시 비밀번호</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="font-bold text-lg tracking-widest">{resetResult.temporaryPassword}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(resetResult.temporaryPassword); toast.success('복사되었습니다.'); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="복사"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              {resetResult.note && (
                <p className="text-sm text-muted-foreground">{resetResult.note}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => { setResetResult(null); fetchUsers(); }}
              className="w-full"
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 강제 초기화 확인 다이얼로그 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 강제 초기화</DialogTitle>
            <DialogDescription>
              이 사용자는 비밀번호 초기화를 요청하지 않았습니다. 계속 진행하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>취소</Button>
            <Button onClick={() => { setShowConfirmDialog(false); doReset(pendingEmail, true); }}>
              진행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Admin() {
  return (
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  );
}
