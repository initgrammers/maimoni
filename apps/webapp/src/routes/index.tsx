import { createFileRoute, Link } from '@tanstack/react-router';
import { ChartColumn, House, Plus, ReceiptText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBase, startAuth } from '../lib/openauth';

type Board = {
  id: string;
  name: string;
};

type Income = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
};

type Expense = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
};

type DashboardResponse = {
  board: Board;
  incomes: Income[];
  expenses: Expense[];
};

type DisplayMovement = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  date: Date;
  note: string | null;
};

type Period = 'week' | 'month' | 'year';

const API_BASE = getApiBase();

export const Route = createFileRoute('/' as never)({
  component: Dashboard,
});

async function fetchDashboard(accessToken: string) {
  const response = await fetch(`${API_BASE}/api/dashboard`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load dashboard');
  }

  return (await response.json()) as DashboardResponse;
}

function Dashboard() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    setAccessToken(window.localStorage.getItem('accessToken'));
    setAnonymousId(window.localStorage.getItem('anonymousId'));
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || !accessToken || data || loading) {
      return;
    }

    const pendingClaimAnonymousId = window.localStorage.getItem(
      'pendingClaimAnonymousId',
    );

    setLoading(true);
    setError(null);

    const claimPromise = pendingClaimAnonymousId
      ? fetch(`${API_BASE}/api/auth/claim`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ anonymousId: pendingClaimAnonymousId }),
        }).then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(payload?.error ?? 'No se pudo reclamar el tablero');
          }
        })
      : Promise.resolve();

    void claimPromise
      .then(async () => {
        if (pendingClaimAnonymousId) {
          window.localStorage.removeItem('pendingClaimAnonymousId');
          window.localStorage.removeItem('anonymousId');
          setAnonymousId(null);
        }

        const dashboard = await fetchDashboard(accessToken);
        setData(dashboard);
      })
      .catch((error) => {
        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el dashboard',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessToken, data, isHydrated, loading]);

  const movements = useMemo<DisplayMovement[]>(() => {
    if (!data) return [];

    const mappedIncomes = data.incomes.map((income) => ({
      id: income.id,
      amount: Number(income.amount),
      type: 'income' as const,
      date: new Date(income.date),
      note: income.note,
    }));

    const mappedExpenses = data.expenses.map((expense) => ({
      id: expense.id,
      amount: Number(expense.amount),
      type: 'expense' as const,
      date: new Date(expense.date),
      note: expense.note,
    }));

    return [...mappedIncomes, ...mappedExpenses].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [data]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const periodMovements = useMemo(() => {
    const now = new Date();
    if (period === 'year') {
      return movements.filter(
        (movement) => movement.date.getFullYear() === now.getFullYear(),
      );
    }

    if (period === 'month') {
      return movements.filter(
        (movement) =>
          movement.date.getFullYear() === now.getFullYear() &&
          movement.date.getMonth() === now.getMonth(),
      );
    }

    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return movements.filter(
      (movement) => movement.date >= startOfWeek && movement.date < endOfWeek,
    );
  }, [movements, period]);

  const weeklyExpenses = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;

    const startOfCurrentWeek = new Date(now);
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    startOfCurrentWeek.setDate(now.getDate() - diffToMonday);

    const startOfPreviousWeek = new Date(startOfCurrentWeek);
    startOfPreviousWeek.setDate(startOfCurrentWeek.getDate() - 7);

    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 7);

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayTotals = new Array(7).fill(0) as number[];
    let currentTotal = 0;
    let previousTotal = 0;

    for (const movement of movements) {
      if (movement.type !== 'expense') continue;

      if (
        movement.date >= startOfCurrentWeek &&
        movement.date < endOfCurrentWeek
      ) {
        currentTotal += movement.amount;
        const weekday = movement.date.getDay();
        const index = weekday === 0 ? 6 : weekday - 1;
        dayTotals[index] += movement.amount;
      }

      if (
        movement.date >= startOfPreviousWeek &&
        movement.date < startOfCurrentWeek
      ) {
        previousTotal += movement.amount;
      }
    }

    const highest = Math.max(...dayTotals, 1);

    return {
      labels,
      dayTotals,
      highest,
      currentTotal,
      previousTotal,
    };
  }, [movements]);

  const weekChange = useMemo(() => {
    const { currentTotal, previousTotal } = weeklyExpenses;
    if (previousTotal === 0) {
      return currentTotal > 0 ? 100 : 0;
    }
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [weeklyExpenses]);

  const expenseCategories = useMemo(() => {
    const grouped = periodMovements
      .filter((movement) => movement.type === 'expense')
      .reduce((acc, movement) => {
        const category = movement.note?.trim() || 'General';
        const existing = acc.get(category);

        if (existing) {
          existing.amount += movement.amount;
          existing.entries += 1;
          return acc;
        }

        acc.set(category, {
          category,
          amount: movement.amount,
          entries: 1,
        });

        return acc;
      }, new Map<
        string,
        { category: string; amount: number; entries: number }
      >());

    return [...grouped.values()].sort((a, b) => b.amount - a.amount);
  }, [periodMovements]);

  async function continueAsAnonymous() {
    setError(null);
    setLoading(true);
    try {
      await startAuth('anonymous');
    } catch (e) {
      console.error('Error al iniciar sesion anonima:', e);
      setError('No se pudo iniciar sesion anonima');
    } finally {
      setLoading(false);
    }
  }

  async function loginAndClaim() {
    setError(null);
    setLoading(true);
    try {
      if (anonymousId) {
        localStorage.setItem('pendingClaimAnonymousId', anonymousId);
      }
      await startAuth('whatsapp');
    } catch (e) {
      console.error('Error al iniciar sesion con WhatsApp:', e);
      setError('No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('anonymousId');
    window.localStorage.removeItem('pendingClaimAnonymousId');
    window.sessionStorage.removeItem('auth_challenge');
    setAccessToken(null);
    setAnonymousId(null);
    setData(null);
    setError(null);
  }

  if (!isHydrated) {
    return <div className="min-h-screen bg-[#f7f7f5]" />;
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-md rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">
            maimonei
          </h1>
          <p className="mb-6 text-base text-slate-500">
            Comienza ahora sin cuenta o inicia sesion para sincronizar tus
            tableros.
          </p>
          <div className="space-y-3">
            <button
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
              onClick={continueAsAnonymous}
              type="button"
              disabled={loading}
            >
              Continuar como anonimo
            </button>
            <button
              className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
              onClick={loginAndClaim}
              type="button"
              disabled={loading}
            >
              Iniciar sesion con WhatsApp
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-md rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-slate-500">
            {loading ? 'Cargando dashboard...' : 'Preparando dashboard...'}
          </p>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <div className="mx-auto w-full max-w-md px-5 pb-28 pt-8">
        <section className="mb-6">
          <div className="rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="mb-2 text-4xl font-semibold tracking-tight text-slate-950">
              {currencyFormatter.format(weeklyExpenses.currentTotal)}
            </p>
            <p className="flex items-center gap-2 text-base text-slate-400">
              Total spent this week
              <span
                className={`rounded-full px-2 py-0.5 text-sm font-semibold ${
                  weekChange >= 0
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {weekChange >= 0 ? '↑' : '↓'} {Math.abs(weekChange).toFixed(0)}%
              </span>
            </p>

            <div className="mt-7 grid grid-cols-7 items-end gap-2">
              {weeklyExpenses.dayTotals.map((amount, index) => (
                <div key={weeklyExpenses.labels[index]} className="text-center">
                  <div className="mx-auto mb-2 flex h-28 w-7 items-end overflow-hidden rounded-xl bg-slate-100">
                    <div
                      className="w-full rounded-xl bg-slate-900 transition-all duration-300"
                      style={{
                        height: `${Math.max(
                          12,
                          (amount / weeklyExpenses.highest) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    {weeklyExpenses.labels[index]}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex rounded-2xl bg-slate-100 p-1 text-sm font-medium">
              {(['week', 'month', 'year'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setPeriod(option);
                  }}
                  className={`flex-1 rounded-xl px-2 py-2 capitalize transition-colors ${
                    period === option
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <main className="space-y-2 pb-3">
          {expenseCategories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
              No hay gastos en este periodo.
            </div>
          )}

          {expenseCategories.map((category) => (
            <div
              key={category.category}
              className="flex items-center justify-between border-b border-slate-200 py-4"
            >
              <div className="min-w-0 pr-3">
                <p className="truncate text-lg font-medium text-slate-800">
                  {category.category}
                </p>
                <p className="text-sm text-slate-400">
                  {category.entries}{' '}
                  {category.entries === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <p className="text-xl font-semibold text-slate-900">
                {currencyFormatter.format(category.amount)}
              </p>
            </div>
          ))}
        </main>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={logout}
          className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          Cerrar sesion
        </button>

        {anonymousId && (
          <button
            type="button"
            onClick={loginAndClaim}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            Iniciar sesion para sincronizar
          </button>
        )}
      </div>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <button
            type="button"
            className="rounded-2xl p-2 text-slate-400"
            aria-label="Dashboard"
          >
            <House className="h-6 w-6" />
          </button>

          <Link
            to="/add"
            search={(current) => current}
            params={(current) => current}
            className="rounded-2xl bg-slate-900 p-3 text-white"
            aria-label="Agregar movimiento"
          >
            <Plus className="h-5 w-5" strokeWidth={3} />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-2xl p-2 text-slate-400"
              aria-label="Resumen"
            >
              <ChartColumn className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="rounded-2xl p-2 text-slate-400"
              aria-label="Movimientos"
            >
              <ReceiptText className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
