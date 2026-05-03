'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { subDays, subMonths, format, parseISO, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart2, TrendingUp, Loader2 } from 'lucide-react';

type PeriodType = 'week' | 'month' | 'all';
type ChartType = 'bar' | 'line';

interface DailySummary { date: string; totalLight: number; }
interface ActivitySummary {
  practiceItemId: string;
  practiceItemName: string;
  description?: string;
  totalCount: number;
  totalLight: number;
}

export function PracticeStatsChart({ refreshKey }: { refreshKey?: number }) {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummary[]>([]);
  const [totalLight, setTotalLight] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(0);
  const [totalGoal, setTotalGoal] = useState(0);
  const [achievementRate, setAchievementRate] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      let start: string | undefined;
      const end = format(now, 'yyyy-MM-dd');

      if (period === 'week') start = format(subDays(now, 6), 'yyyy-MM-dd');
      else if (period === 'month') start = format(subMonths(now, 1), 'yyyy-MM-dd');
      else start = undefined;

      const data = await api.getMyStats(start, end);
      setDailySummaries(data.dailySummaries || []);
      setActivitySummaries(data.activitySummaries || []);
      setTotalLight(data.totalLight || 0);
      setDailyGoal(data.dailyLightGoal || 0);
      setTotalGoal(data.totalLightGoal || 0);
      setAchievementRate(data.achievementRate || 0);
    } catch (error) {
      console.error('fetchStats error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, refreshKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartData = dailySummaries.map(d => ({
    date: (() => {
      try { return format(parseISO(d.date), 'M/d', { locale: ko }); }
      catch { return d.date; }
    })(),
    빛: d.totalLight,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5" />
            나의 빛 모으기 역사 통계
          </span>
          <div className="flex items-center gap-2">
            {/* 기간 선택 */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[90px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">일주일</SelectItem>
                <SelectItem value="month">한달</SelectItem>
                <SelectItem value="all">전체</SelectItem>
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
                      <td className="px-3 py-2 font-bold">검색기간 나의 빛</td>
                      <td className="text-right px-3 py-2 text-muted-foreground">—</td>
                      <td className="text-right px-3 py-2 font-bold text-yellow-600">
                        {totalLight}
                        {totalGoal > 0 && (
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
