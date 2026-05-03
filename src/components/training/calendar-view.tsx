'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { CalendarDays } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DayButton } from 'react-day-picker';
import type React from 'react';

interface CalendarViewProps {
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  refreshKey?: number;
}

interface DayLight {
  date: string;
  totalLight: number;
}

/** 빛 수치에 따른 이모지 */
function getLightEmoji(light: number): string {
  if (light <= 0) return '';
  if (light >= 10) return '☀️';
  if (light >= 5) return '🌤️';
  return '⛅';
}

export function CalendarView({ onDateSelect, selectedDate, refreshKey }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [dayLights, setDayLights] = useState<DayLight[]>([]);

  // 해당 월의 빛 통계 조회
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    api.getMyStats(start, end)
      .then((data) => {
        setDayLights(data.dailySummaries || []);
      })
      .catch(() => setDayLights([]));
  }, [currentMonth, refreshKey]);

  const getLightForDate = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dayLights.find(d => d.date === dateStr)?.totalLight || 0;
  };

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  // Custom DayButton with emoji overlay
  function LightDayButton({ day, modifiers, className, ...props }: React.ComponentProps<typeof DayButton>) {
    const light = getLightForDate(day.date);
    const emoji = getLightEmoji(light);

    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        className={cn(className, 'flex-col gap-0 leading-none')}
        {...props}
      >
        <span>{day.date.getDate()}</span>
        {emoji && (
          <span className="text-[10px] leading-none opacity-90">{emoji}</span>
        )}
      </CalendarDayButton>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="w-5 h-5" />
          캘린더
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect?.(date)}
          onDayClick={(day) => onDateSelect?.(day)}
          onMonthChange={handleMonthChange}
          locale={ko}
          className="rounded-md"
          components={{
            DayButton: LightDayButton,
          }}
        />
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">⛅ 1~4빛</span>
          <span className="flex items-center gap-1">🌤️ 5~9빛</span>
          <span className="flex items-center gap-1">☀️ 10빛+</span>
        </div>
      </CardContent>
    </Card>
  );
}
