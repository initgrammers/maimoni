import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { House, Plus, Settings, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../components/ui/drawer';
import { getApiBase, startAuth } from '../lib/openauth';

dayjs.locale('es');

type Board = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

type Income = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryName: string;
  categoryEmoji: string;
};

type Expense = {
  id: string;
  amount: string;
  date: string;
  note: string | null;
  categoryName: string;
  categoryEmoji: string;
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
  categoryName: string;
  categoryEmoji: string;
};

type Period = 'week' | 'month' | 'year';
type DashboardView = 'dashboard' | 'profile' | 'settings';
type PigMood = 'sin_datos' | 'zen' | 'fuerte' | 'alerta' | 'urgencia';

function getMovementDateLabel(date: Date) {
  const target = dayjs(date);
  if (target.isSame(dayjs(), 'day')) return 'Hoy';
  if (target.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Ayer';
  return target.format('dddd D MMM');
}

const API_BASE = getApiBase();
const dashboardQueryKey = (accessToken: string) =>
  ['dashboard', accessToken] as const;

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
    throw new Error('No se pudo cargar el tablero');
  }

  return (await response.json()) as DashboardResponse;
}

async function claimAnonymousBoard(accessToken: string, anonymousId: string) {
  const response = await fetch(`${API_BASE}/api/auth/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ anonymousId }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo reclamar el tablero');
  }
}

async function updateBoardSettings(
  accessToken: string,
  boardId: string,
  spendingLimitAmount: string | null,
) {
  const response = await fetch(`${API_BASE}/api/boards/${boardId}/settings`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ spendingLimitAmount }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo actualizar la configuración');
  }

  return (await response.json()) as { board: Board };
}

async function removeExpense(accessToken: string, expenseId: string) {
  const response = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo eliminar el gasto');
  }
}

type BoardLimitSettingsCardProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
  successMessage: string | null;
  errorMessage: string | null;
};

function BoardLimitSettingsCard({
  value,
  onChange,
  onSave,
  onClear,
  saving,
  successMessage,
  errorMessage,
}: BoardLimitSettingsCardProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-base font-semibold text-slate-900">
          Límite de gasto
        </p>
        <p className="text-sm text-slate-500">
          Define un monto máximo para tu tablero actual.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">
          Monto (USD)
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          placeholder="Ej: 250.00"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          disabled={saving}
        />
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all active:scale-95 disabled:opacity-60"
        >
          Quitar límite
        </button>
      </div>

      {successMessage && (
        <p className="text-sm text-emerald-700">{successMessage}</p>
      )}
      {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
    </div>
  );
}

function DashboardLoading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
          <p className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="h-2 rounded-full bg-slate-100" />
            <div className="h-2 rounded-full bg-slate-200" />
            <div className="h-2 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);
  const [pendingClaimAnonymousId, setPendingClaimAnonymousId] = useState<
    string | null
  >(null);
  const [claimRequestKey, setClaimRequestKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [view, setView] = useState<DashboardView>('dashboard');
  const [spendingLimitInput, setSpendingLimitInput] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [expenseActionError, setExpenseActionError] = useState<string | null>(
    null,
  );
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] =
    useState(false);

  useEffect(() => {
    setAccessToken(window.localStorage.getItem('accessToken'));
    setAnonymousId(window.localStorage.getItem('anonymousId'));
    setPendingClaimAnonymousId(
      window.localStorage.getItem('pendingClaimAnonymousId'),
    );
    setIsHydrated(true);
  }, []);

  const claimMutation = useMutation<
    void,
    Error,
    { token: string; anonymous: string }
  >({
    mutationFn: ({ token, anonymous }) => claimAnonymousBoard(token, anonymous),
    onSuccess: async (_data, variables) => {
      window.localStorage.removeItem('pendingClaimAnonymousId');
      window.localStorage.removeItem('anonymousId');
      setAnonymousId(null);
      setPendingClaimAnonymousId(null);
      setClaimRequestKey(null);
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(variables.token),
      });
    },
    onError: (claimError) => {
      setError(
        claimError instanceof Error
          ? claimError.message
          : 'No se pudo reclamar el tablero',
      );
    },
  });

  useEffect(() => {
    if (!accessToken || !pendingClaimAnonymousId) {
      return;
    }

    const nextRequestKey = `${accessToken}:${pendingClaimAnonymousId}`;
    if (claimMutation.isPending || claimRequestKey === nextRequestKey) {
      return;
    }

    setClaimRequestKey(nextRequestKey);
    claimMutation.mutate({
      token: accessToken,
      anonymous: pendingClaimAnonymousId,
    });
  }, [
    accessToken,
    claimMutation,
    claimMutation.isPending,
    claimRequestKey,
    pendingClaimAnonymousId,
  ]);

  const dashboardQuery = useQuery<DashboardResponse, Error>({
    queryKey: accessToken
      ? dashboardQueryKey(accessToken)
      : (['dashboard', 'guest'] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('Falta el token de acceso');
      }
      return fetchDashboard(accessToken);
    },
    enabled:
      isHydrated &&
      Boolean(accessToken) &&
      !pendingClaimAnonymousId &&
      !claimMutation.isPending,
    refetchOnMount: 'always',
  });

  const data = dashboardQuery.data ?? null;

  useEffect(() => {
    setSpendingLimitInput(data?.board.spendingLimitAmount ?? '');
  }, [data?.board.spendingLimitAmount]);

  const boardSettingsMutation = useMutation<
    { board: Board },
    Error,
    { boardId: string; spendingLimitAmount: string | null }
  >({
    mutationFn: ({ boardId, spendingLimitAmount }) => {
      if (!accessToken) {
        throw new Error('Sesión no disponible');
      }
      return updateBoardSettings(accessToken, boardId, spendingLimitAmount);
    },
    onSuccess: ({ board }) => {
      if (!accessToken) {
        return;
      }

      queryClient.setQueryData<DashboardResponse>(
        dashboardQueryKey(accessToken),
        (previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            board,
          };
        },
      );
    },
  });

  const deleteExpenseMutation = useMutation<void, Error, { expenseId: string }>(
    {
      mutationFn: ({ expenseId }) => {
        if (!accessToken) {
          throw new Error('Sesión no disponible');
        }

        return removeExpense(accessToken, expenseId);
      },
      onSuccess: async () => {
        if (!accessToken) {
          return;
        }

        await queryClient.invalidateQueries({
          queryKey: dashboardQueryKey(accessToken),
        });
      },
    },
  );

  const isRefreshingDashboard =
    dashboardQuery.isFetching && !!dashboardQuery.data;
  const showInitialDashboardLoading =
    claimMutation.isPending ||
    (dashboardQuery.isPending && !dashboardQuery.data);

  const movements = useMemo<DisplayMovement[]>(() => {
    if (!data) return [];

    const mappedIncomes = data.incomes.map((income) => ({
      id: income.id,
      amount: Number(income.amount),
      type: 'income' as const,
      date: new Date(income.date),
      note: income.note,
      categoryName: income.categoryName,
      categoryEmoji: income.categoryEmoji,
    }));

    const mappedExpenses = data.expenses.map((expense) => ({
      id: expense.id,
      amount: Number(expense.amount),
      type: 'expense' as const,
      date: new Date(expense.date),
      note: expense.note,
      categoryName: expense.categoryName,
      categoryEmoji: expense.categoryEmoji,
    }));

    return [...mappedIncomes, ...mappedExpenses].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }, [data]);

  const selectedExpense = useMemo(() => {
    if (!selectedExpenseId) {
      return null;
    }

    return movements.find(
      (movement) =>
        movement.id === selectedExpenseId && movement.type === 'expense',
    );
  }, [movements, selectedExpenseId]);

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

  const groupedMovements = useMemo(() => {
    type Group = {
      label: string;
      date: Date;
      movements: DisplayMovement[];
    };

    const grouped: Record<string, Group> = {};

    for (const movement of periodMovements) {
      const key = movement.date.toDateString();
      if (grouped[key]) {
        grouped[key].movements.push(movement);
      } else {
        grouped[key] = {
          label: getMovementDateLabel(movement.date),
          date: movement.date,
          movements: [movement],
        };
      }
    }

    return Object.values(grouped)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((group) => [group.label, group.movements] as const);
  }, [periodMovements]);

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

    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
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

  const monthlyExpenseTotal = useMemo(() => {
    const now = new Date();
    return movements
      .filter(
        (movement) =>
          movement.type === 'expense' &&
          movement.date.getFullYear() === now.getFullYear() &&
          movement.date.getMonth() === now.getMonth(),
      )
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const monthlyLimit = useMemo(() => {
    const raw = data?.board.spendingLimitAmount;
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }, [data?.board.spendingLimitAmount]);

  const monthlyProgress = useMemo(() => {
    if (!monthlyLimit) {
      return {
        ratio: 0,
        percent: 0,
        remaining: null,
        mood: 'sin_datos' as PigMood,
      };
    }

    const ratio = monthlyExpenseTotal / monthlyLimit;
    const remaining = Math.max(monthlyLimit - monthlyExpenseTotal, 0);

    let mood: PigMood = 'urgencia';
    if (ratio <= 0.5) mood = 'zen';
    else if (ratio <= 0.8) mood = 'fuerte';
    else if (ratio <= 1) mood = 'alerta';

    return {
      ratio,
      percent: Math.min(ratio * 100, 100),
      remaining,
      mood,
    };
  }, [monthlyExpenseTotal, monthlyLimit]);

  async function continueAsAnonymous() {
    setError(null);
    setLoading(true);
    try {
      await startAuth('anonymous');
    } catch (e) {
      console.error('Error al iniciar sesión anónima:', e);
      setError('No se pudo iniciar sesión anónima');
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
      console.error('Error al iniciar sesión con WhatsApp:', e);
      setError('No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    if (accessToken) {
      queryClient.removeQueries({
        queryKey: dashboardQueryKey(accessToken),
      });
    }
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('anonymousId');
    window.localStorage.removeItem('pendingClaimAnonymousId');
    window.sessionStorage.removeItem('auth_challenge');
    setAccessToken(null);
    setAnonymousId(null);
    setPendingClaimAnonymousId(null);
    setClaimRequestKey(null);
    setError(null);
    setSettingsError(null);
    setSettingsSuccess(null);
    setView('dashboard');
  }

  function normalizeAmount(value: string) {
    return value.trim().replace(',', '.');
  }

  async function saveSpendingLimit() {
    if (!data) return;

    const parsed = normalizeAmount(spendingLimitInput);
    if (!/^\d+(\.\d{1,2})?$/.test(parsed)) {
      setSettingsSuccess(null);
      setSettingsError('Ingresa un monto válido con hasta 2 decimales');
      return;
    }

    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      const response = await boardSettingsMutation.mutateAsync({
        boardId: data.board.id,
        spendingLimitAmount: parsed,
      });
      setSpendingLimitInput(response.board.spendingLimitAmount ?? '');
      setSettingsSuccess('Límite actualizado correctamente');
    } catch (updateError) {
      setSettingsError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo guardar el límite',
      );
    }
  }

  async function clearSpendingLimit() {
    if (!data) return;

    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      await boardSettingsMutation.mutateAsync({
        boardId: data.board.id,
        spendingLimitAmount: null,
      });
      setSpendingLimitInput('');
      setSettingsSuccess('Límite eliminado correctamente');
    } catch (updateError) {
      setSettingsError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo eliminar el límite',
      );
    }
  }

  function handleExpenseDrawerOpenChange(open: boolean) {
    setIsExpenseDrawerOpen(open);

    if (!open) {
      setSelectedExpenseId(null);
      setExpenseActionError(null);
      setShowDeleteExpenseConfirm(false);
    }
  }

  function openExpenseDetails(expense: DisplayMovement) {
    if (expense.type !== 'expense') {
      return;
    }

    setSelectedExpenseId(expense.id);
    setExpenseActionError(null);
    setShowDeleteExpenseConfirm(false);
    setIsExpenseDrawerOpen(true);
  }

  async function deleteSelectedExpense() {
    if (!selectedExpenseId) {
      return;
    }

    setExpenseActionError(null);
    try {
      await deleteExpenseMutation.mutateAsync({
        expenseId: selectedExpenseId,
      });
      handleExpenseDrawerOpenChange(false);
    } catch (deleteError) {
      setExpenseActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el gasto',
      );
    }
  }

  useEffect(() => {
    if (!isExpenseDrawerOpen) {
      return;
    }

    if (!selectedExpense) {
      setIsExpenseDrawerOpen(false);
      setSelectedExpenseId(null);
      setExpenseActionError(null);
      setShowDeleteExpenseConfirm(false);
    }
  }, [isExpenseDrawerOpen, selectedExpense]);

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
        <div className="mx-auto flex min-h-[78vh] w-full max-w-md items-center">
          <div className="w-full rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-lg font-semibold uppercase tracking-wide text-emerald-700">
                Bienvenido a
              </h1>
              <img
                src="/img/maimoni.png"
                alt="Maimoni"
                className="mx-auto mb-3 h-28 w-auto object-contain"
              />
            </div>

            <div className="space-y-3">
              <button
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                onClick={continueAsAnonymous}
                type="button"
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Continuar sin cuenta'}
              </button>
              <button
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition-all active:scale-95 disabled:opacity-60"
                onClick={loginAndClaim}
                type="button"
                disabled={loading}
              >
                Iniciar sesión con WhatsApp
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-slate-500">
              Puedes usar la app sin cuenta. Si inicias sesión, tus datos se
              guardan y sincronizan entre dispositivos.
            </p>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    if (showInitialDashboardLoading) {
      return (
        <DashboardLoading
          title="Cargando tu tablero"
          description="Sincronizando ingresos, gastos y configuración..."
        />
      );
    }

    if (dashboardQuery.error || error) {
      return (
        <DashboardLoading
          title="No pudimos cargar tu tablero"
          description={
            error ??
            dashboardQuery.error?.message ??
            'Intenta nuevamente en unos segundos.'
          }
        />
      );
    }

    return (
      <DashboardLoading
        title="Preparando tablero"
        description="Esto tomará solo un momento."
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <div className="mx-auto w-full max-w-md px-5 pb-28 pt-8">
        {view === 'dashboard' && (
          <>
            {anonymousId && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-indigo-50 p-4 text-sm text-indigo-900 shadow-sm border border-indigo-100">
                <p className="font-medium">
                  Puedes usar la app sin iniciar sesión, pero al hacerlo evitas
                  perder datos y los sincronizas entre dispositivos.
                </p>
                <button
                  type="button"
                  onClick={loginAndClaim}
                  disabled={loading}
                  className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 font-bold text-white transition-all active:scale-95 disabled:opacity-60"
                >
                  Iniciar sesión
                </button>
              </div>
            )}

            <section className="mb-6">
              <div className="relative rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                {isRefreshingDashboard && (
                  <div className="absolute right-4 top-4 h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                )}
                <p className="mb-2 text-4xl font-semibold tracking-tight text-slate-950">
                  {currencyFormatter.format(weeklyExpenses.currentTotal)}
                </p>
                <p className="flex items-center gap-2 text-base text-slate-400">
                  Total gastado esta semana
                  <span
                    className={`rounded-full px-2 py-0.5 text-sm font-semibold ${
                      weekChange >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {weekChange >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(weekChange).toFixed(0)}%
                  </span>
                </p>

                <div className="mt-7 grid grid-cols-7 items-end gap-2">
                  {weeklyExpenses.dayTotals.map((amount, index) => (
                    <div
                      key={weeklyExpenses.labels[index]}
                      className="text-center"
                    >
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
                      {option === 'week'
                        ? 'Semana'
                        : option === 'month'
                          ? 'Mes'
                          : 'Año'}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="mb-6">
              <div className="relative rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-5 shadow-[0_12px_30px_rgba(16,185,129,0.12)]">
                {isRefreshingDashboard && (
                  <div className="absolute right-4 top-4 h-5 w-5 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" />
                )}
                <div className="flex min-h-[150px] items-stretch gap-4">
                  <div className="w-28 shrink-0 self-stretch">
                    <img
                      src={`/img/piggi/${monthlyProgress.mood}.png`}
                      alt="Estado del ahorro mensual"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                        Límite mensual de gastos
                      </p>
                      <p className="text-sm text-slate-600">
                        {monthlyLimit
                          ? `${currencyFormatter.format(monthlyExpenseTotal)} de ${currencyFormatter.format(monthlyLimit)}`
                          : 'Configura un límite para ver tu progreso del mes'}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
                        {monthlyLimit
                          ? `${Math.min(monthlyProgress.ratio * 100, 999).toFixed(0)}% usado`
                          : 'Sin datos'}
                      </p>

                      <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            monthlyProgress.ratio <= 0.8
                              ? 'bg-emerald-500'
                              : monthlyProgress.ratio <= 1
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${monthlyProgress.percent}%` }}
                        />
                      </div>

                      <div className="mt-2 text-xs font-medium text-slate-600">
                        {monthlyLimit && monthlyProgress.remaining !== null
                          ? `Restante: ${currencyFormatter.format(monthlyProgress.remaining)}`
                          : 'Sin límite configurado'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <main className="relative pb-3">
              {isRefreshingDashboard && (
                <div className="absolute right-0 top-0 h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
              )}

              {groupedMovements.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  No hay movimientos en este periodo.
                </div>
              ) : (
                groupedMovements.map(([label, groupMovements]) => (
                  <section key={label} className="mt-6">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {label}
                    </p>
                    <div className="space-y-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                      {groupMovements.map((movement) => {
                        const content = (
                          <>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                                {movement.categoryEmoji}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {movement.categoryName}
                                </p>
                                {movement.note && (
                                  <p className="truncate text-xs text-slate-500">
                                    {movement.note}
                                  </p>
                                )}
                                {movement.type === 'expense' && (
                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Toca para ver o editar
                                  </p>
                                )}
                              </div>
                            </div>
                            <p
                              className={`whitespace-nowrap text-sm font-semibold ${
                                movement.type === 'income'
                                  ? 'text-emerald-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {currencyFormatter.format(movement.amount)}
                            </p>
                          </>
                        );

                        if (movement.type === 'expense') {
                          return (
                            <button
                              key={movement.id}
                              type="button"
                              onClick={() => openExpenseDetails(movement)}
                              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-3 text-left transition-all active:scale-[0.99]"
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <div
                            key={movement.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-3"
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </main>

            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          </>
        )}

        {view === 'profile' && !anonymousId && (
          <section className="rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="space-y-6">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">
                  Perfil
                </p>
                <p className="text-sm text-slate-500">
                  Administra tu cuenta y cierra sesión cuando lo necesites.
                </p>
              </div>
              <BoardLimitSettingsCard
                value={spendingLimitInput}
                onChange={setSpendingLimitInput}
                onSave={() => {
                  void saveSpendingLimit();
                }}
                onClear={() => {
                  void clearSpendingLimit();
                }}
                saving={boardSettingsMutation.isPending}
                successMessage={settingsSuccess}
                errorMessage={settingsError}
              />
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Si necesitas proteger tu dispositivo o cerrar sesión remota,
                  usa el botón de abajo.
                </p>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all active:scale-95"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          </section>
        )}

        {view === 'settings' && anonymousId && (
          <section className="rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <div className="space-y-6">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">
                  Configuración
                </p>
                <p className="text-sm text-slate-500">
                  Ajusta el límite de gasto para este tablero.
                </p>
              </div>
              <BoardLimitSettingsCard
                value={spendingLimitInput}
                onChange={setSpendingLimitInput}
                onSave={() => {
                  void saveSpendingLimit();
                }}
                onClear={() => {
                  void clearSpendingLimit();
                }}
                saving={boardSettingsMutation.isPending}
                successMessage={settingsSuccess}
                errorMessage={settingsError}
              />
            </div>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          </section>
        )}
      </div>

      <Drawer
        open={isExpenseDrawerOpen}
        onOpenChange={handleExpenseDrawerOpenChange}
      >
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle>Detalle del gasto</DrawerTitle>
            <DrawerDescription>
              Puedes revisar, editar o eliminar este gasto.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {!selectedExpense ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No encontramos ese gasto. Cierra e intenta nuevamente.
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {currencyFormatter.format(selectedExpense.amount)}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Categoría:</span>{' '}
                  {selectedExpense.categoryEmoji} {selectedExpense.categoryName}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Fecha:</span>{' '}
                  {dayjs(selectedExpense.date).format('D MMM YYYY')}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Nota:</span>{' '}
                  {selectedExpense.note ?? 'Sin nota'}
                </p>
              </div>
            )}

            {showDeleteExpenseConfirm && selectedExpense && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Esta acción eliminará el gasto del tablero. Puedes continuar
                solo si estás seguro.
              </div>
            )}

            {expenseActionError && (
              <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                {expenseActionError}
              </p>
            )}
          </div>

          <DrawerFooter className="pb-8">
            {!selectedExpense ? (
              <DrawerClose asChild>
                <button
                  type="button"
                  className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>
              </DrawerClose>
            ) : showDeleteExpenseConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void deleteSelectedExpense();
                  }}
                  disabled={deleteExpenseMutation.isPending}
                  className="w-full rounded-[20px] bg-rose-600 py-4 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {deleteExpenseMutation.isPending
                    ? 'Eliminando...'
                    : 'Si, eliminar gasto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteExpenseConfirm(false);
                    setExpenseActionError(null);
                  }}
                  disabled={deleteExpenseMutation.isPending}
                  className="w-full rounded-[20px] border border-slate-300 bg-white py-4 text-base font-semibold text-slate-700 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    navigate({
                      to: `/expenses/${selectedExpense.id}/edit` as never,
                    });
                    handleExpenseDrawerOpenChange(false);
                    setExpenseActionError(null);
                    setShowDeleteExpenseConfirm(false);
                  }}
                  className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Editar gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteExpenseConfirm(true);
                    setExpenseActionError(null);
                  }}
                  className="w-full rounded-[20px] border border-rose-300 bg-rose-50 py-4 text-base font-semibold text-rose-700 transition-all active:scale-[0.98]"
                >
                  Eliminar gasto
                </button>
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="w-full rounded-[20px] border border-slate-300 bg-white py-4 text-base font-semibold text-slate-700 transition-all active:scale-[0.98]"
                  >
                    Cerrar
                  </button>
                </DrawerClose>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-8 py-6 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 items-center">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              view === 'dashboard'
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-transparent text-slate-400 hover:bg-slate-50'
            }`}
            aria-label="Ir al tablero"
          >
            <House className="h-6 w-6" />
          </button>

          <div className="flex items-center justify-center">
            <Link
              to="/add"
              search={(current) => current}
              params={(current) => current}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200/80 transition-all hover:bg-emerald-600 active:scale-95"
              aria-label="Agregar movimiento"
            >
              <Plus className="h-7 w-7" strokeWidth={3} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              setView(anonymousId ? 'settings' : 'profile');
            }}
            className={`justify-self-end flex h-12 w-12 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              (anonymousId && view === 'settings') ||
              (!anonymousId && view === 'profile')
                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                : 'border-transparent text-slate-400 hover:bg-slate-50'
            }`}
            aria-label={anonymousId ? 'Ver configuración' : 'Ver perfil'}
          >
            {anonymousId ? (
              <Settings className="h-6 w-6" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
