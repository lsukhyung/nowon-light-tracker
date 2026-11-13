'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { subDays, subMonths, format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart2, TrendingUp, Loader2 } from 'lucide-react';

type PeriodType = 'week' | 'month' | 'all' | 'custom';
type ChartType = 'bar' | 'line';
type ViewMode = 'all' | 'haengong_bonsuryeon' | 'walking';

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; summaryLabel: string }[] = [
  { value: 'all', label: '전체', summaryLabel: '검색기간 나의 빛' },
  { value: 'haengong_bonsuryeon', label: '행공+본수련', summaryLabel: '행공+본수련 합계' },
  { value: 'walking', label: '걷기역사 (짧은 코스)', summaryLabel: '걷기역사 (짧은 코스) 합계' },
];

interface DailySummary { date: string; totalLight: number; }
interface ActivitySummary {
  practiceItemId: string;
  practiceItemName: string;
  description?: string;
  totalCount: number;
  totalLight: number;
}

export function PracticeStatsChart({ refreshKey }: { refreshKey?: number }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const oneMonthAgoStr = format(subMonths(new Date(), 1), 'yyyy-MM-dd');

  const [period, setPeriod] = useState<PeriodType>('week');
  const [startDate, setStartDate] = useState<string>(oneMonthAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummary[]>([]);
  const [totalLight, setTotalLight] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalGoal, setTotalGoal] = useState(0);
  const [achievementRate, setAchievementRate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (period === 'custom' && (!startDate || !endDate || startDate > endDate)) {
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date();
      let start: string | undefined;
      let end: string | undefined = format(now, 'yyyy-MM-dd');

      if (period === 'week') start = format(subDays(now, 6), 'yyyy-MM-dd');
      else if (period === 'month') start = format(subMonths(now, 1), 'yyyy-MM-dd');
      else if (period === 'custom') {
        start = startDate;
        end = endDate;
      } else {
        start = undefined;
      }

      const data = await api.getMyStats(start, end, viewMode);
      setDailySummaries(data.dailySummaries || []);
      setActivitySummaries(data.activitySummaries || []);
      setTotalLight(data.totalLight || 0);
      setTotalCount(data.totalCount || 0);
      setTotalGoal(data.totalLightGoal || 0);
      setAchievementRate(data.achievementRate || 0);
    } catch (error) {
      console.error('fetchStats error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, viewMode, refreshKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && endDate && value > endDate) {
      setEndDate(value);
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (value && startDate && value < startDate) {
      setStartDate(value);
    }
  };

  const currentViewOption = VIEW_MODE_OPTIONS.find((o) => o.value === viewMode) || VIEW_MODE_OPTIONS[0];

  const chartData = dailySummaries.map(d => ({
    date: (() => {
      try { return format(parseISO(d.date), 'M/d', { locale: ko }); }
      catch { return d.date; }
    })(),
    빛: d.totalLight,
  }));

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5" />
            나의 빛 모으기 역사 통계
          </span>
          <div className="flex items-center gap-2">
            {/* 기간 선택 */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[105px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">일주일</SelectItem>
                <SelectItem value="month">한달</SelectItem>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="custom">기간 선택</SelectItem>
              </SelectContent>
            </Select>
            {/* 차트 타입 */}
            <Button
              variant={chartType === 'bar' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('bar')}
            >
              <BarChart2 className="w-4 h-4" />
            </Button>
            <Button
              variant={chartType === 'line' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setChartType('line')}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>

        {/* 기간 직접 선택 입력 */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">시작</span>
              <Input
                type="date"
                value={startDate}
                max={todayStr}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="h-8 w-[138px] text-xs sm:text-sm"
              />
            </div>
            <span className="text-xs text-muted-foreground">~</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">종료</span>
              <Input
                type="date"
                value={endDate}
                max={todayStr}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="h-8 w-[138px] text-xs sm:text-sm"
              />
            </div>
          </div>
        )}

        {/* 실천현황 조회 유형 선택 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {VIEW_MODE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={viewMode === option.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => setViewMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && chartData.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            기간 내 기록이 없습니다.
          </div>
        ) : (
          <div className={isLoading ? "opacity-50 transition-opacity" : "transition-opacity"}>
            {/* 그래프: 일자별 빛 합계 */}
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [`${value}빛`, '빛']}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="빛" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [`${value}빛`, '빛']}
                      labelStyle={{ color: 'var(--foreground)' }}
                    />
                    <Line type="monotone" dataKey="빛" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* 실천현황 테이블 */}
            {activitySummaries.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">실천활동</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">횟수</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">빛</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitySummaries.map((a) => (
                      <tr key={a.practiceItemId} className="border-t">
                        <td className="px-3 py-2">
                          <p className="font-medium">{a.practiceItemName}</p>
                          {a.description && (
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          )}
                        </td>
                        <td className="text-right px-3 py-2">{a.totalCount.toLocaleString()}</td>
                        <td className="text-right px-3 py-2 font-semibold">{a.totalLight}</td>
                      </tr>
                    ))}
                    {/* 합계 행 */}
                    <tr className="border-t bg-muted/30">
                      <td className="px-3 py-2 font-bold">{currentViewOption.summaryLabel}</td>
                      <td className="text-right px-3 py-2 font-semibold text-muted-foreground">
                        {viewMode === 'all' ? '—' : totalCount.toLocaleString()}
                      </td>
                      <td className="text-right px-3 py-2 font-bold text-yellow-600">
                        {totalLight}
                        {viewMode === 'all' && totalGoal > 0 && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (목표대비 {achievementRate}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
