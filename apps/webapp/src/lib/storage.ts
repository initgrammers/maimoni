import dayjs from 'dayjs';

const DASHBOARD_PERIOD_KEY = 'dashboardPeriod';
const STATS_PERIOD_KEY = 'maimoni_stats_period';

export type StatsPeriodType = 'month' | 'year';

export interface StatsPeriod {
  type: StatsPeriodType;
  value: string;
}

export function getDashboardPeriod(): dayjs.Dayjs {
  if (typeof window === 'undefined') {
    return dayjs();
  }

  const stored = localStorage.getItem(DASHBOARD_PERIOD_KEY);
  if (stored) {
    const parsed = dayjs(stored, 'YYYY-MM');
    if (parsed.isValid()) {
      return parsed;
    }
  }
  return dayjs();
}

export function setDashboardPeriod(date: dayjs.Dayjs): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(DASHBOARD_PERIOD_KEY, date.format('YYYY-MM'));
}

export function getStatsPeriod(): StatsPeriod {
  if (typeof window === 'undefined') {
    return { type: 'month', value: dayjs().format('YYYY-MM') };
  }

  const stored = localStorage.getItem(STATS_PERIOD_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StatsPeriod;
      if (
        (parsed.type === 'month' || parsed.type === 'year') &&
        typeof parsed.value === 'string' &&
        parsed.value.length > 0
      ) {
        if (parsed.type === 'month') {
          const date = dayjs(parsed.value, 'YYYY-MM');
          if (date.isValid()) {
            return parsed;
          }
        } else {
          const date = dayjs(parsed.value, 'YYYY');
          if (date.isValid()) {
            return parsed;
          }
        }
      }
    } catch {
      // Invalid JSON, return default
    }
  }
  return { type: 'month', value: dayjs().format('YYYY-MM') };
}

export function setStatsPeriod(period: StatsPeriod): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STATS_PERIOD_KEY, JSON.stringify(period));
}

export function getStatsMonth(): dayjs.Dayjs {
  const period = getStatsPeriod();
  if (period.type === 'month') {
    const date = dayjs(period.value, 'YYYY-MM');
    if (date.isValid()) {
      return date;
    }
  }
  return dayjs();
}

export function getStatsYear(): number {
  const period = getStatsPeriod();
  if (period.type === 'year') {
    const date = dayjs(period.value, 'YYYY');
    if (date.isValid()) {
      return date.year();
    }
  }
  return dayjs().year();
}

export function getStatsPeriodType(): StatsPeriodType {
  const period = getStatsPeriod();
  return period.type;
}

export function setStatsMonth(month: dayjs.Dayjs): void {
  setStatsPeriod({ type: 'month', value: month.format('YYYY-MM') });
}

export function setStatsYear(year: number): void {
  setStatsPeriod({ type: 'year', value: String(year) });
}
