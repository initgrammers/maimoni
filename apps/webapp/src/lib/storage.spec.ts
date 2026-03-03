import dayjs from 'dayjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDashboardPeriod, setDashboardPeriod } from './storage';

const LOCAL_STORAGE_KEY = 'dashboardPeriod';

describe('storage', () => {
  let localStorageMock: Record<string, string>;
  let originalLocalStorage: Storage;
  let originalWindow: typeof globalThis.window;

  beforeEach(() => {
    localStorageMock = {};
    originalLocalStorage = globalThis.localStorage;
    originalWindow = globalThis.window;
    globalThis.window = globalThis as unknown as Window & typeof globalThis;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] ?? null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    globalThis.window = originalWindow;
  });

  describe('getDashboardPeriod', () => {
    it('should return current month when localStorage is empty', () => {
      const result = getDashboardPeriod();
      const now = dayjs();

      expect(result.format('YYYY-MM')).toBe(now.format('YYYY-MM'));
    });

    it('should return stored period when valid date exists', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = '2025-06';

      const result = getDashboardPeriod();

      expect(result.format('YYYY-MM')).toBe('2025-06');
      expect(result.year()).toBe(2025);
      expect(result.month()).toBe(5);
    });

    it('should return current month when stored date is invalid', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = 'invalid-date';

      const result = getDashboardPeriod();
      const now = dayjs();

      expect(result.format('YYYY-MM')).toBe(now.format('YYYY-MM'));
    });

    it('should return current month when stored date has wrong format', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = '06/2025';

      const result = getDashboardPeriod();
      const now = dayjs();

      expect(result.format('YYYY-MM')).toBe(now.format('YYYY-MM'));
    });
  });

  describe('setDashboardPeriod', () => {
    it('should store period in YYYY-MM format', () => {
      const date = dayjs('2025-03-15');

      setDashboardPeriod(date);

      expect(localStorageMock[LOCAL_STORAGE_KEY]).toBe('2025-03');
    });

    it('should overwrite existing stored period', () => {
      localStorageMock[LOCAL_STORAGE_KEY] = '2024-01';
      const newDate = dayjs('2025-06-20');

      setDashboardPeriod(newDate);

      expect(localStorageMock[LOCAL_STORAGE_KEY]).toBe('2025-06');
    });
  });
});
