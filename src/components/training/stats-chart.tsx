'use client';

import { useTrainingStore } from '@/store/training-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { TrendingUp, Calendar, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { useState } from 'react';

type PeriodType = 'week' | 'month' | 'all' | 'custom';

export function StatsChart() {
  const { records } = useTrainingStore();
  const [period, setPeriod] = useState<PeriodType>('week');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  // 기본값: 종료일은 오늘, 시작일은 한 달 전
  const today = format(new Date(), 'yyyy-MM-dd');
  const oneMonthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  const [startDate, setStartDate] = useState<string>(oneMonthAgo);
  const [endDate, setEndDate] = useState<string>(today);

  const getFilteredRecords = () => {
    const now = new Date();

    if (period === 'custom' && startDate && endDate) {
      return records.filter((r) => {
        const recordDate = new Date(r.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return recordDate >= start && recordDate <= end;
      });
    }

    switch (period) {
      case 'week':
        return records.filter((r) => {
          const recordDate = new Date(r.date);
          const weekAgo = subDays(now, 7);
          return recordDate >= weekAgo;
        });
      case 'month':
        return records.filter((r) => {
          const recordDate = new Date(r.date);
          const monthAgo = subDays(now, 30);
          return recordDate >= monthAgo;
        });
      default:
        return records;
    }
  };

  const prepareChartData = () => {
    const filtered = getFilteredRecords();
    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sorted.map((record) => ({
      date: format(new Date(record.date), 'M/d', { locale: ko }),
      체조: record.체조 ? 1 : 0,
      행공: record.행공,
      본수련: record.본수련,
      행공본수련합계: (record.행공 || 0) + (record.본수련 || 0),
      회건술: record.회건술 ? 1 : 0,
      석문도서봉독: record.석문도서봉독 ? 1 : 0,
      행공퍼센트: record.행공퍼센트,
      운광복습: record.운광복습,
      삼주축광: record.삼주축광,
      내면공간: record.내면공간,
      마음과마음가짐수련: record.마음과마음가짐수련,
      total: calculateDailyScore(record),
    }));
  };

  /**
   * 등급을 점수로 변환
   * C=100점 (기준), A/B는 가점, D/E/F는 차감
   */
  const gradeToScore = (grade: string): number => {
    const gradeScores: { [key: string]: number } = {
      A: 120, // +20점 가점
      B: 110, // +10점 가점
      C: 100, // 기준점
      D: 90,  // -10점 차감
      E: 80,  // -20점 차감
      F: 70,  // -30점 차감
    };
    return gradeScores[grade] || 70;
  };

  /**
   * 일일 종합 점수 계산
   *
   * 기준점 100점을 기준으로, 초과 시 가점, 미달 시 차감
   * 9개 항목의 평균으로 최종 점수 산출
   *
   * @param record 수련 기록
   * @returns 종합 점수 (0-200점 범위, 평균 100점)
   */
  const calculateDailyScore = (record: any) => {
    const scores: number[] = [];

    // 1. Boolean 항목 (체조, 회건술, 석문도서봉독, 나의역사)
    //    기준: 2개 체크 = 100점
    //    예시: 1개 = 50점(-50), 2개 = 100점(기준), 3개 = 150점(+50), 4개 = 200점(+100)
    const booleanCount = [record.체조, record.회건술, record.석문도서봉독, record.나의역사].filter(Boolean).length;
    scores.push((booleanCount / 2) * 100);

    // 2. 행공 + 본수련 합계
    //    기준: 6회 = 100점
    //    예시: 3회 = 50점(-50), 6회 = 100점(기준), 9회 = 150점(+50)
    const 행공본수련합계 = (record.행공 || 0) + (record.본수련 || 0);
    scores.push((행공본수련합계 / 6) * 100);

    // 3. 마음과마음가짐수련
    //    기준: 3회 = 100점
    //    예시: 1회 = 33점(-67), 3회 = 100점(기준), 5회 = 167점(+67)
    scores.push(((record.마음과마음가짐수련 || 0) / 3) * 100);

    // 4. 퍼센트 항목 (행공퍼센트, 운광복습, 삼주축광, 내면공간)
    //    기준: 각각 50% = 100점
    //    예시: 25% = 50점(-50), 50% = 100점(기준), 75% = 150점(+50)
    scores.push(((record.행공퍼센트 || 0) / 50) * 100);
    scores.push(((record.운광복습 || 0) / 50) * 100);
    scores.push(((record.삼주축광 || 0) / 50) * 100);
    scores.push(((record.내면공간 || 0) / 50) * 100);

    // 5. 등급 항목 (회광반조, 성찰탐구)
    //    기준: C = 100점
    //    가점: A = 120점(+20), B = 110점(+10)
    //    차감: D = 90점(-10), E = 80점(-20), F = 70점(-30)
    scores.push(gradeToScore(record.회광반조 || 'F'));
    scores.push(gradeToScore(record.성찰탐구 || 'F'));

    // 9개 항목의 평균 계산
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
  };

  const calculateAverage = () => {
    const data = prepareChartData();
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, curr) => acc + curr.total, 0);
    return Math.round(sum / data.length);
  };

  const calculateTotals = () => {
    const filtered = getFilteredRecords();
    const 행공Total = filtered.reduce((sum, record) => sum + (record.행공 || 0), 0);
    const 본수련Total = filtered.reduce((sum, record) => sum + (record.본수련 || 0), 0);
    return { 행공Total, 본수련Total };
  };

  const chartData = prepareChartData();
  const averageScore = calculateAverage();
  const { 행공Total, 본수련Total } = calculateTotals();

  // 커스텀 툴팁 컴포넌트
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // 제외할 항목: 행공, 운광복습, 삼주축광
      const excludedItems = ['행공', '삼주축광', '운광복습'];
      const filteredPayload = payload.filter(
        (entry: any) => !excludedItems.includes(entry.name)
      );

      return (
        <div
          style={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-sm font-bold text-primary mb-1">
            종합 점수: {data.total}점
          </p>
          <p className="text-sm text-orange-600 font-semibold">
            행공: {data.행공}회
          </p>
          <p className="text-sm text-blue-600 font-semibold mb-1">
            본수련: {data.본수련}회
          </p>
          {filteredPayload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : Line;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis />
          <Tooltip
            content={<CustomTooltip />}
            position={{ y: -10 }}
            allowEscapeViewBox={{ y: true }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Legend />
          <DataComponent dataKey="행공퍼센트" name="행공" fill="#22c55e" stroke="#22c55e" strokeWidth={2} />
          <DataComponent dataKey="삼주축광" name="삼주축광" fill="#8b5cf6" stroke="#8b5cf6" strokeWidth={2} />
          <DataComponent dataKey="운광복습" name="운광복습" fill="#3b82f6" stroke="#3b82f6" strokeWidth={2} />
          <DataComponent dataKey="내면공간" name="내면공간" fill="#ec4899" stroke="#ec4899" strokeWidth={2} />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            수련 통계
          </CardTitle>
          <div className="flex gap-2 flex-wrap items-center">
            {period === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">시작:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">종료:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </>
            )}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-36">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">일주일</SelectItem>
                <SelectItem value="month">한 달</SelectItem>
                <SelectItem value="custom">기간 선택</SelectItem>
                <SelectItem value="all">전체</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md p-1">
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded transition-colors ${
                  chartType === 'bar'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                title="막대 차트"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded transition-colors ${
                  chartType === 'line'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                title="선 차트"
              >
                <LineChartIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 text-center">
            <div>
              <p className="text-sm text-muted-foreground">평균 종합 점수</p>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{averageScore}점</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">행공 합계</p>
              <p className="text-3xl sm:text-4xl font-bold text-green-600">{행공Total}회</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">본수련 합계</p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-600">{본수련Total}회</p>
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          renderChart()
        ) : (
          <div className="h-300 flex items-center justify-center text-muted-foreground">
            기록된 데이터가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
