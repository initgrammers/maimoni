import { createFileRoute } from '@tanstack/react-router';
import { Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
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

  const totals = useMemo(() => {
    const totalIncome = movements
      .filter((m) => m.type === 'income')
      .reduce((sum, m) => sum + m.amount, 0);
    const totalExpenses = movements
      .filter((m) => m.type === 'expense')
      .reduce((sum, m) => sum + m.amount, 0);
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }, [movements]);

  const groupedMovements = useMemo(() => {
    return movements.reduce(
      (groups, movement) => {
        const dateKey = movement.date.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(movement);
        return groups;
      },
      {} as Record<string, DisplayMovement[]>,
    );
  }, [movements]);

  async function continueAsAnonymous() {
    setError(null);
    setLoading(true);
    try {
      await startAuth('anonymous');
    } catch {
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
    } catch {
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
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-5 py-10">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-3xl font-black tracking-tight">maimonei</h1>
          <p className="text-slate-300">
            Comienza ahora sin cuenta o inicia sesion para sincronizar tus
            tableros.
          </p>
          <button
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white"
            onClick={continueAsAnonymous}
            type="button"
            disabled={loading}
          >
            Continuar como anonimo
          </button>
          <button
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-bold text-white"
            onClick={loginAndClaim}
            type="button"
            disabled={loading}
          >
            Iniciar sesion con WhatsApp
          </button>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-5 py-10">
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-slate-300 text-sm">
            {loading ? 'Cargando dashboard...' : 'Preparando dashboard...'}
          </p>
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {data.board.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {anonymousId && (
              <button
                type="button"
                onClick={loginAndClaim}
                disabled={loading}
                className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                Iniciar sesion
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold text-white"
            >
              Cerrar sesion
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/add';
              }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={3} />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400 mb-2 tracking-wide uppercase">
              Balance Disponible
            </p>
            <p className="text-5xl font-black text-white mb-6 tracking-tight">
              ${totals.balance.toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ingresos</p>
                  <p className="text-lg font-bold text-emerald-400">
                    ${totals.totalIncome.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Gastos</p>
                  <p className="text-lg font-bold text-rose-400">
                    ${totals.totalExpenses.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 pb-8">
        <h2 className="text-lg font-bold text-white mb-4 tracking-tight">
          Movimientos
        </h2>

        <div className="space-y-6">
          {Object.entries(groupedMovements).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                {date}
              </p>
              <div className="space-y-2">
                {items.map((movement) => (
                  <div
                    key={movement.id}
                    className="group relative overflow-hidden rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-white truncate">
                        {movement.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </p>
                      <p
                        className={`text-lg font-black flex-shrink-0 ${
                          movement.type === 'income'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {movement.type === 'income' ? '+' : '-'}$
                        {movement.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {movement.date.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {movement.note && (
                        <>
                          <span>•</span>
                          <span className="truncate">{movement.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
