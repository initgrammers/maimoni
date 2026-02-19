import dayjs, { type Dayjs } from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

dayjs.extend(localeData);

export interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  className?: string;
}

const WEEK_COUNT = 6;
const WEEK_LENGTH = 7;

function formatWeekday(label: string) {
  const trimmed = label.slice(0, 2);
  if (trimmed.length === 0) return '';
  if (trimmed.length === 1) return trimmed.toUpperCase();
  return `${trimmed[0].toUpperCase()}${trimmed[1].toLowerCase()}`;
}

function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  month,
  onMonthChange,
}: CalendarProps) {
  const localeData = dayjs.localeData();
  const firstDayOfWeek = localeData.firstDayOfWeek();
  const currentMonth = dayjs(month ?? selected ?? new Date());
  const startOfMonth = currentMonth.startOf('month');
  const offset =
    (startOfMonth.day() - firstDayOfWeek + WEEK_LENGTH) % WEEK_LENGTH;
  const gridStart = startOfMonth.subtract(offset, 'day');

  const weeks: Dayjs[][] = [];
  for (let weekIndex = 0; weekIndex < WEEK_COUNT; weekIndex += 1) {
    const week: Dayjs[] = [];
    for (let dayIndex = 0; dayIndex < WEEK_LENGTH; dayIndex += 1) {
      week.push(gridStart.add(weekIndex * WEEK_LENGTH + dayIndex, 'day'));
    }
    weeks.push(week);
  }

  const weekdays = localeData.weekdaysShort();
  const orderedWeekdays = [
    ...weekdays.slice(firstDayOfWeek),
    ...weekdays.slice(0, firstDayOfWeek),
  ];

  const today = dayjs();
  const selectedDay = selected ? dayjs(selected) : null;

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const nextMonth =
      direction === 'prev'
        ? currentMonth.subtract(1, 'month')
        : currentMonth.add(1, 'month');
    onMonthChange?.(nextMonth.toDate());
  };

  const handleDayClick = (day: Dayjs) => {
    onSelect?.(day.toDate());
  };

  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]',
        className,
      )}
      data-calendar-mode={mode}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-lg font-semibold capitalize text-slate-900">
          {currentMonth.format('MMMM YYYY')}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleMonthChange('prev')}
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <ChevronLeft className="mx-auto h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleMonthChange('next')}
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
          >
            <ChevronRight className="mx-auto h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-center text-slate-400">
        {orderedWeekdays.map((weekday) => (
          <span key={weekday}>{formatWeekday(weekday)}</span>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {weeks.map((week) => {
          const weekKey = week[0].format('YYYY-MM-DD');

          return (
            <div key={weekKey} className="grid grid-cols-7 gap-2">
              {week.map((day) => {
                const isOutsideMonth = day.month() !== currentMonth.month();
                const isToday = day.isSame(today, 'day');
                const isSelected = selectedDay?.isSame(day, 'day');

                return (
                  <button
                    key={day.format('YYYY-MM-DD')}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'h-12 w-12 rounded-2xl text-sm font-semibold transition-all duration-150',
                      'flex items-center justify-center border',
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                        : 'border-transparent text-slate-900 hover:border-slate-200 hover:bg-slate-50',
                      isOutsideMonth && !isSelected
                        ? 'text-slate-300 opacity-70 hover:bg-slate-100 hover:border-slate-100'
                        : '',
                      isToday && !isSelected
                        ? 'border-slate-200 bg-slate-100'
                        : '',
                    )}
                  >
                    {day.date()}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
