import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  BarChart3,
  House,
  Plus,
  Settings,
  TrendingUp,
  User,
} from 'lucide-react';
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
  role: 'owner' | 'editor' | 'viewer';
  boards: Array<{
    id: string;
    name: string;
    spendingLimitAmount: string | null;
    role: 'owner' | 'editor' | 'viewer';
  }>;
  incomes: Income[];
  expenses: Expense[];
};

type BoardInvitation = {
  id: string;
  boardId: string;
  invitedByUserId: string | null;
  invitedPhoneNumber: string | null;
  inviteeUserId: string | null;
  acceptedByUserId: string | null;
  inviteTokenHash: string | null;
  targetRole: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inviterName: string | null;
  inviterPhone: string | null;
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
type DashboardView = 'dashboard' | 'stats' | 'profile' | 'settings';
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

async function fetchDashboard(accessToken: string, boardId?: string | null) {
  const url = new URL(`${API_BASE}/api/dashboard`);
  if (boardId) {
    url.searchParams.set('boardId', boardId);
  }

  const response = await fetch(url.toString(), {
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

async function removeIncome(accessToken: string, incomeId: string) {
  const response = await fetch(`${API_BASE}/api/incomes/${incomeId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo eliminar el ingreso');
  }
}

async function removeBoard(accessToken: string, boardId: string) {
  const response = await fetch(`${API_BASE}/api/boards/${boardId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo eliminar el tablero');
  }
}

async function fetchBoardInvitations(accessToken: string, boardId: string) {
  const response = await fetch(
    `${API_BASE}/api/boards/${boardId}/invitations`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudieron cargar las invitaciones');
  }

  return (await response.json()) as BoardInvitation[];
}

async function createBoardInvitation(
  accessToken: string,
  boardId: string,
  payload: {
    targetRole: 'editor' | 'viewer';
    ttlHours: number;
    phoneNumber?: string;
  },
) {
  const response = await fetch(
    `${API_BASE}/api/boards/${boardId}/invitations`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo crear la invitación');
  }

  return (await response.json()) as {
    invitation: BoardInvitation;
    inviteToken: string;
  };
}

async function revokeInvitation(accessToken: string, invitationId: string) {
  const response = await fetch(
    `${API_BASE}/api/invitations/${invitationId}/revoke`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo revocar la invitación');
  }
}

type BoardSelectorCardProps = {
  boards: DashboardResponse['boards'];
  activeBoardId: string;
  onBoardTap: (board: DashboardResponse['boards'][number]) => void;
};

const roleLabels: Record<string, string> = {
  owner: 'Dueño',
  editor: 'Editor',
  viewer: 'Lector',
};

function BoardSelectorCard({
  boards: boardList,
  activeBoardId,
  onBoardTap,
}: BoardSelectorCardProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-base font-semibold text-slate-900">Mis tableros</p>
        <p className="text-sm text-slate-500">
          {boardList.length === 1
            ? 'Tienes un tablero. Toca para ver sus detalles.'
            : `Tienes ${boardList.length} tableros. Toca uno para ver sus detalles.`}
        </p>
      </div>

      <div className="space-y-2">
        {boardList.map((board) => {
          const isActive = board.id === activeBoardId;
          return (
            <button
              key={board.id}
              type="button"
              onClick={() => {
                onBoardTap(board);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
                isActive
                  ? 'border-slate-900 bg-white shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}
                >
                  {board.name}
                </p>
                <p className="text-xs text-slate-500">
                  {roleLabels[board.role] ?? board.role}
                </p>
              </div>
              {isActive && (
                <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Activo
                </span>
              )}
            </button>
          );
        })}
      </div>
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
  const [statsPeriod, setStatsPeriod] = useState<Period>('week');
  const [view, setView] = useState<DashboardView>('dashboard');
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteTtlHours, setInviteTtlHours] = useState('168');
  const [invitePhoneNumber, setInvitePhoneNumber] = useState('');
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [expenseActionError, setExpenseActionError] = useState<string | null>(
    null,
  );
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] =
    useState(false);
  const [isIncomeDrawerOpen, setIsIncomeDrawerOpen] = useState(false);
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [incomeActionError, setIncomeActionError] = useState<string | null>(
    null,
  );
  const [showDeleteIncomeConfirm, setShowDeleteIncomeConfirm] = useState(false);
  const [isBoardDrawerOpen, setIsBoardDrawerOpen] = useState(false);
  const [selectedBoardForDrawer, setSelectedBoardForDrawer] = useState<
    DashboardResponse['boards'][number] | null
  >(null);
  const [showDeleteBoardConfirm, setShowDeleteBoardConfirm] = useState(false);
  const [boardActionError, setBoardActionError] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(window.localStorage.getItem('accessToken'));
    setAnonymousId(window.localStorage.getItem('anonymousId'));
    setSelectedBoardId(window.localStorage.getItem('activeBoardId'));
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
      window.localStorage.removeItem('pendingClaimAnonymousId');
      setPendingClaimAnonymousId(null);
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
      ? ([...dashboardQueryKey(accessToken), selectedBoardId] as const)
      : (['dashboard', 'guest'] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('Falta el token de acceso');
      }
      return fetchDashboard(accessToken, selectedBoardId);
    },
    enabled:
      isHydrated &&
      Boolean(accessToken) &&
      !pendingClaimAnonymousId &&
      !claimMutation.isPending,
    refetchOnMount: 'always',
  });

  const data = dashboardQuery.data ?? null;

  const invitationsQuery = useQuery<BoardInvitation[], Error>({
    queryKey:
      accessToken && data?.board.id
        ? (['board-invitations', accessToken, data.board.id] as const)
        : (['board-invitations', 'guest'] as const),
    queryFn: () => {
      if (!accessToken || !data?.board.id) {
        throw new Error('No hay tablero seleccionado');
      }

      return fetchBoardInvitations(accessToken, data.board.id);
    },
    enabled: Boolean(accessToken && data?.board.id),
  });

  const pendingInvitations = useMemo(
    () =>
      (invitationsQuery.data ?? []).filter(
        (invitation) => invitation.status === 'pending',
      ),
    [invitationsQuery.data],
  );

  useEffect(() => {
    if (!data?.board.id) {
      return;
    }

    if (selectedBoardId !== data.board.id) {
      setSelectedBoardId(data.board.id);
    }

    window.localStorage.setItem('activeBoardId', data.board.id);
  }, [data?.board.id, selectedBoardId]);

  const createInvitationMutation = useMutation<
    { invitation: BoardInvitation; inviteToken: string },
    Error,
    {
      boardId: string;
      targetRole: 'editor' | 'viewer';
      ttlHours: number;
      phoneNumber?: string;
    }
  >({
    mutationFn: ({ boardId, targetRole, ttlHours, phoneNumber }) => {
      if (!accessToken) {
        throw new Error('Sesión no disponible');
      }

      return createBoardInvitation(accessToken, boardId, {
        targetRole,
        ttlHours,
        phoneNumber,
      });
    },
    onSuccess: async () => {
      if (!accessToken || !data?.board.id) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['board-invitations', accessToken, data.board.id],
      });
    },
  });

  const revokeInvitationMutation = useMutation<
    void,
    Error,
    { invitationId: string }
  >({
    mutationFn: ({ invitationId }) => {
      if (!accessToken) {
        throw new Error('Sesión no disponible');
      }

      return revokeInvitation(accessToken, invitationId);
    },
    onSuccess: async () => {
      if (!accessToken || !data?.board.id) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ['board-invitations', accessToken, data.board.id],
      });
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

  const deleteIncomeMutation = useMutation<void, Error, { incomeId: string }>({
    mutationFn: ({ incomeId }) => {
      if (!accessToken) {
        throw new Error('Sesión no disponible');
      }

      return removeIncome(accessToken, incomeId);
    },
    onSuccess: async () => {
      if (!accessToken) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(accessToken),
      });
    },
  });

  const deleteBoardMutation = useMutation<void, Error, { boardId: string }>({
    mutationFn: ({ boardId }) => {
      if (!accessToken) {
        throw new Error('Sesión no disponible');
      }

      return removeBoard(accessToken, boardId);
    },
    onSuccess: async (_, { boardId }) => {
      const activeBoardId = window.localStorage.getItem('activeBoardId');
      if (activeBoardId === boardId) {
        window.localStorage.removeItem('activeBoardId');
        setSelectedBoardId(null);
      }

      handleBoardDrawerOpenChange(false);

      if (!accessToken) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKey(accessToken),
      });
    },
  });

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

  const selectedIncome = useMemo(() => {
    if (!selectedIncomeId) {
      return null;
    }

    return movements.find(
      (movement) =>
        movement.id === selectedIncomeId && movement.type === 'income',
    );
  }, [movements, selectedIncomeId]);

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

  const dashboardMovements = useMemo(() => {
    const now = new Date();
    return movements.filter(
      (movement) =>
        movement.date.getFullYear() === now.getFullYear() &&
        movement.date.getMonth() === now.getMonth(),
    );
  }, [movements]);

  const groupedMovements = useMemo(() => {
    type Group = {
      label: string;
      date: Date;
      movements: DisplayMovement[];
    };

    const grouped: Record<string, Group> = {};

    for (const movement of dashboardMovements) {
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
  }, [dashboardMovements]);

  const statsPeriodExpenses = useMemo(() => {
    const now = new Date();
    const monthLabels = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    if (statsPeriod === 'week') {
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

      return {
        labels,
        dayTotals,
        highest: Math.max(...dayTotals, 1),
        currentTotal,
        previousTotal,
        summaryLabel: 'semana',
      };
    }

    if (statsPeriod === 'month') {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const previousYear = previousMonthDate.getFullYear();
      const previousMonth = previousMonthDate.getMonth();
      const labels = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5'];
      const dayTotals = new Array(5).fill(0) as number[];
      let currentTotal = 0;
      let previousTotal = 0;

      for (const movement of movements) {
        if (movement.type !== 'expense') continue;

        const movementYear = movement.date.getFullYear();
        const movementMonth = movement.date.getMonth();

        if (movementYear === currentYear && movementMonth === currentMonth) {
          currentTotal += movement.amount;
          const dayOfMonth = movement.date.getDate();
          const weekOfMonth = Math.min(Math.floor((dayOfMonth - 1) / 7), 4);
          dayTotals[weekOfMonth] += movement.amount;
        }

        if (movementYear === previousYear && movementMonth === previousMonth) {
          previousTotal += movement.amount;
        }
      }

      return {
        labels,
        dayTotals,
        highest: Math.max(...dayTotals, 1),
        currentTotal,
        previousTotal,
        summaryLabel: 'mes',
      };
    }

    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    const dayTotals = new Array(12).fill(0) as number[];
    let currentTotal = 0;
    let previousTotal = 0;

    for (const movement of movements) {
      if (movement.type !== 'expense') continue;

      const movementYear = movement.date.getFullYear();

      if (movementYear === currentYear) {
        currentTotal += movement.amount;
        dayTotals[movement.date.getMonth()] += movement.amount;
      }

      if (movementYear === previousYear) {
        previousTotal += movement.amount;
      }
    }

    return {
      labels: monthLabels,
      dayTotals,
      highest: Math.max(...dayTotals, 1),
      currentTotal,
      previousTotal,
      summaryLabel: 'año',
    };
  }, [movements, statsPeriod]);

  const statsPeriodChange = useMemo(() => {
    const { currentTotal, previousTotal } = statsPeriodExpenses;
    if (previousTotal === 0) {
      return currentTotal > 0 ? 100 : 0;
    }
    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }, [statsPeriodExpenses]);

  const statsCategoryBreakdown = useMemo(() => {
    const now = new Date();
    let periodExpenses: DisplayMovement[] = [];

    if (statsPeriod === 'week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(now.getDate() - diffToMonday);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      periodExpenses = movements.filter(
        (m) =>
          m.type === 'expense' && m.date >= startOfWeek && m.date < endOfWeek,
      );
    } else if (statsPeriod === 'month') {
      periodExpenses = movements.filter(
        (m) =>
          m.type === 'expense' &&
          m.date.getFullYear() === now.getFullYear() &&
          m.date.getMonth() === now.getMonth(),
      );
    } else {
      periodExpenses = movements.filter(
        (m) =>
          m.type === 'expense' && m.date.getFullYear() === now.getFullYear(),
      );
    }

    const categoryTotals: Record<
      string,
      { name: string; emoji: string; total: number; color: string }
    > = {};

    const colors = [
      '#3b82f6',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
    ];

    let colorIndex = 0;

    for (const expense of periodExpenses) {
      const key = expense.categoryName;
      if (categoryTotals[key]) {
        categoryTotals[key].total += expense.amount;
      } else {
        categoryTotals[key] = {
          name: expense.categoryName,
          emoji: expense.categoryEmoji,
          total: expense.amount,
          color: colors[colorIndex % colors.length],
        };
        colorIndex++;
      }
    }

    const totalExpense = periodExpenses.reduce((sum, m) => sum + m.amount, 0);

    const categories = Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .map((cat) => ({
        ...cat,
        percentage: totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0,
      }));

    return { categories, totalExpense };
  }, [movements, statsPeriod]);

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

  const monthlyIncomeTotal = useMemo(() => {
    const now = new Date();
    return movements
      .filter(
        (movement) =>
          movement.type === 'income' &&
          movement.date.getFullYear() === now.getFullYear() &&
          movement.date.getMonth() === now.getMonth(),
      )
      .reduce((sum, movement) => sum + movement.amount, 0);
  }, [movements]);

  const netBalance = useMemo(() => {
    return monthlyIncomeTotal - monthlyExpenseTotal;
  }, [monthlyIncomeTotal, monthlyExpenseTotal]);

  const topMonthlyCategories = useMemo(() => {
    const now = new Date();
    const monthlyExpenses = movements.filter(
      (m) =>
        m.type === 'expense' &&
        m.date.getFullYear() === now.getFullYear() &&
        m.date.getMonth() === now.getMonth(),
    );

    const categoryTotals: Record<
      string,
      { name: string; emoji: string; total: number }
    > = {};

    for (const expense of monthlyExpenses) {
      const key = expense.categoryName;
      if (categoryTotals[key]) {
        categoryTotals[key].total += expense.amount;
      } else {
        categoryTotals[key] = {
          name: expense.categoryName,
          emoji: expense.categoryEmoji,
          total: expense.amount,
        };
      }
    }

    const totalExpense = monthlyExpenses.reduce((sum, m) => sum + m.amount, 0);

    return Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((cat) => ({
        ...cat,
        percentage: totalExpense > 0 ? (cat.total / totalExpense) * 100 : 0,
      }));
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
    window.localStorage.removeItem('auth_challenge');
    setAccessToken(null);
    setAnonymousId(null);
    setPendingClaimAnonymousId(null);
    setClaimRequestKey(null);
    setError(null);
    setView('dashboard');
  }

  async function createInvitationLink() {
    if (!data) return;

    const ttlHours = Number(inviteTtlHours);
    if (!Number.isFinite(ttlHours) || ttlHours < 1) {
      setInviteError('La duración debe ser mayor o igual a 1 hora');
      return;
    }

    setInviteError(null);
    setInviteSuccess(null);

    try {
      const result = await createInvitationMutation.mutateAsync({
        boardId: data.board.id,
        targetRole: inviteRole,
        ttlHours,
        phoneNumber: invitePhoneNumber.trim() || undefined,
      });

      const inviteUrl = `${window.location.origin}/invite?token=${encodeURIComponent(result.inviteToken)}`;

      let copied = false;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        copied = true;
      } catch {
        // iOS Safari loses user-gesture context after await, fallback to execCommand
        try {
          const textarea = document.createElement('textarea');
          textarea.value = inviteUrl;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          copied = false;
        }
      }

      setInvitePhoneNumber('');
      setInviteSuccess(
        copied
          ? 'Invitación creada y copiada al portapapeles'
          : `Invitación creada. Copia el enlace: ${inviteUrl}`,
      );
    } catch (invitationError) {
      setInviteError(
        invitationError instanceof Error
          ? invitationError.message
          : 'No se pudo crear la invitación',
      );
    }
  }

  async function revokeInvitationById(invitationId: string) {
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await revokeInvitationMutation.mutateAsync({ invitationId });
      setInviteSuccess('Invitación revocada correctamente');
    } catch (revokeError) {
      setInviteError(
        revokeError instanceof Error
          ? revokeError.message
          : 'No se pudo revocar la invitación',
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

  function handleIncomeDrawerOpenChange(open: boolean) {
    setIsIncomeDrawerOpen(open);

    if (!open) {
      setSelectedIncomeId(null);
      setIncomeActionError(null);
      setShowDeleteIncomeConfirm(false);
    }
  }

  function openIncomeDetails(income: DisplayMovement) {
    if (income.type !== 'income') {
      return;
    }

    setSelectedIncomeId(income.id);
    setIncomeActionError(null);
    setShowDeleteIncomeConfirm(false);
    setIsIncomeDrawerOpen(true);
  }

  function handleBoardDrawerOpenChange(open: boolean) {
    setIsBoardDrawerOpen(open);

    if (!open) {
      setSelectedBoardForDrawer(null);
      setShowDeleteBoardConfirm(false);
      setBoardActionError(null);
    }
  }

  function openBoardDetails(board: DashboardResponse['boards'][number]) {
    setSelectedBoardForDrawer(board);
    setShowDeleteBoardConfirm(false);
    setBoardActionError(null);
    setIsBoardDrawerOpen(true);
  }

  function selectBoardFromDrawer() {
    if (!selectedBoardForDrawer) {
      return;
    }

    const boardId = selectedBoardForDrawer.id;
    setSelectedBoardId(boardId);
    window.localStorage.setItem('activeBoardId', boardId);
    setInviteError(null);
    setInviteSuccess(null);
    handleBoardDrawerOpenChange(false);
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

  async function deleteSelectedIncome() {
    if (!selectedIncomeId) {
      return;
    }

    setIncomeActionError(null);
    try {
      await deleteIncomeMutation.mutateAsync({
        incomeId: selectedIncomeId,
      });
      handleIncomeDrawerOpenChange(false);
    } catch (deleteError) {
      setIncomeActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el ingreso',
      );
    }
  }

  async function deleteSelectedBoard() {
    if (!selectedBoardForDrawer) {
      return;
    }

    setBoardActionError(null);
    try {
      await deleteBoardMutation.mutateAsync({
        boardId: selectedBoardForDrawer.id,
      });
    } catch (deleteError) {
      setBoardActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'No se pudo eliminar el tablero',
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

  useEffect(() => {
    if (!isIncomeDrawerOpen) {
      return;
    }

    if (!selectedIncome) {
      setIsIncomeDrawerOpen(false);
      setSelectedIncomeId(null);
      setIncomeActionError(null);
      setShowDeleteIncomeConfirm(false);
    }
  }, [isIncomeDrawerOpen, selectedIncome]);

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
                Iniciar sesión con número de teléfono
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
    if (dashboardQuery.error || error) {
      return (
        <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
          <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
            <div className="w-full rounded-[28px] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-lg font-semibold tracking-tight text-slate-900">
                No pudimos cargar tu tablero
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {error ??
                  dashboardQuery.error?.message ??
                  'Intenta nuevamente en unos segundos.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem('accessToken');
                  window.localStorage.removeItem('refreshToken');
                  window.localStorage.removeItem('anonymousId');
                  window.localStorage.removeItem('pendingClaimAnonymousId');
                  window.localStorage.removeItem('auth_challenge');
                  window.localStorage.removeItem('activeBoardId');
                  window.location.reload();
                }}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-all active:scale-95"
              >
                Cerrar sesión y volver a intentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (showInitialDashboardLoading) {
      return (
        <DashboardLoading
          title="Cargando tu tablero"
          description="Sincronizando ingresos, gastos y configuración..."
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

            <p className="mb-6 text-lg font-semibold tracking-tight text-slate-900">
              {data.board.name}
            </p>

            <section className="mb-6">
              <div
                className={`relative rounded-[28px] border px-5 py-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
                  netBalance >= 0
                    ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_12px_30px_rgba(16,185,129,0.12)]'
                    : 'border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-[0_12px_30px_rgba(244,63,94,0.12)]'
                }`}
              >
                {isRefreshingDashboard && (
                  <div
                    className={`absolute right-4 top-4 h-5 w-5 rounded-full border-2 animate-spin ${
                      netBalance >= 0
                        ? 'border-emerald-200 border-t-emerald-700'
                        : 'border-rose-200 border-t-rose-700'
                    }`}
                  />
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-semibold uppercase tracking-wide ${
                        netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      Balance Neto
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Ingresos - Gastos del mes
                    </p>
                  </div>
                  <p
                    className={`text-3xl font-semibold tracking-tight ${
                      netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {currencyFormatter.format(netBalance)}
                  </p>
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

            {topMonthlyCategories.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-sm font-medium text-slate-500">
                  Top categorías del mes
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {topMonthlyCategories.map((category) => (
                    <div
                      key={category.name}
                      className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm"
                    >
                      <span className="mb-1 text-3xl">{category.emoji}</span>
                      <p className="text-center text-xs font-medium text-slate-700">
                        {category.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {currencyFormatter.format(category.total)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {category.percentage.toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Toca para ver o editar
                                </p>
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
                          <button
                            key={movement.id}
                            type="button"
                            onClick={() => openIncomeDetails(movement)}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 px-3 py-3 text-left transition-all active:scale-[0.99]"
                          >
                            {content}
                          </button>
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

        {view === 'stats' && (
          <>
            <p className="mb-6 text-lg font-semibold tracking-tight text-slate-900">
              Estadísticas
            </p>

            <section className="mb-6">
              <div className="relative rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                {isRefreshingDashboard && (
                  <div className="absolute right-4 top-4 h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                )}
                <p className="mb-2 text-4xl font-semibold tracking-tight text-slate-950">
                  {currencyFormatter.format(statsPeriodExpenses.currentTotal)}
                </p>
                <p className="flex items-center gap-2 text-base text-slate-400">
                  {`Total gastado este ${statsPeriodExpenses.summaryLabel}`}
                  <span
                    className={`rounded-full px-2 py-0.5 text-sm font-semibold ${
                      statsPeriodChange >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {statsPeriodChange >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(statsPeriodChange).toFixed(0)}%
                  </span>
                </p>

                <div
                  className="mt-7 grid items-end gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${statsPeriodExpenses.labels.length}, minmax(0, 1fr))`,
                  }}
                >
                  {statsPeriodExpenses.dayTotals.map((amount, index) => (
                    <div
                      key={statsPeriodExpenses.labels[index]}
                      className="text-center"
                    >
                      <div className="mx-auto mb-2 flex h-28 w-full items-end overflow-hidden rounded-xl bg-slate-100">
                        <div
                          className="w-full rounded-xl bg-slate-900 transition-all duration-300"
                          style={{
                            height: `${Math.max(
                              12,
                              (amount / statsPeriodExpenses.highest) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs font-medium text-slate-400">
                        {statsPeriodExpenses.labels[index]}
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
                        setStatsPeriod(option);
                      }}
                      className={`flex-1 rounded-xl px-2 py-2 capitalize transition-colors ${
                        statsPeriod === option
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

            {statsCategoryBreakdown.categories.length > 0 && (
              <section className="mb-6">
                <div className="relative rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  {isRefreshingDashboard && (
                    <div className="absolute right-4 top-4 h-5 w-5 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                  )}
                  <p className="mb-4 text-sm font-medium text-slate-500">
                    Distribución por categoría
                  </p>

                  <div className="flex flex-col items-center">
                    <div className="relative h-48 w-48">
                      <svg
                        viewBox="0 0 100 100"
                        className="h-full w-full -rotate-90"
                      >
                        <title>Distribución de gastos por categoría</title>
                        {(() => {
                          const categories = statsCategoryBreakdown.categories;

                          if (categories.length === 1) {
                            return (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill={categories[0].color}
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          }

                          let accumulatedAngle = 0;
                          return categories.map((cat) => {
                            const angle = (cat.percentage / 100) * 360;
                            const startAngle = accumulatedAngle;
                            accumulatedAngle += angle;
                            const endAngle = accumulatedAngle;

                            const startRad = (startAngle * Math.PI) / 180;
                            const endRad = (endAngle * Math.PI) / 180;

                            const x1 = 50 + 40 * Math.cos(startRad);
                            const y1 = 50 + 40 * Math.sin(startRad);
                            const x2 = 50 + 40 * Math.cos(endRad);
                            const y2 = 50 + 40 * Math.sin(endRad);

                            const largeArcFlag = angle > 180 ? 1 : 0;

                            const pathData = [
                              `M 50 50`,
                              `L ${x1} ${y1}`,
                              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                              `Z`,
                            ].join(' ');

                            return (
                              <path
                                key={cat.name}
                                d={pathData}
                                fill={cat.color}
                                stroke="white"
                                strokeWidth="2"
                              />
                            );
                          });
                        })()}
                        <circle cx="50" cy="50" r="20" fill="white" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-semibold text-slate-900">
                          {currencyFormatter.format(
                            statsCategoryBreakdown.totalExpense,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 w-full space-y-3">
                      {statsCategoryBreakdown.categories.map((cat) => (
                        <div
                          key={cat.name}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              {cat.emoji}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {cat.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {cat.percentage.toFixed(1)}% del total
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">
                            {currencyFormatter.format(cat.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
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
              <BoardSelectorCard
                boards={data.boards}
                activeBoardId={data.board.id}
                onBoardTap={openBoardDetails}
              />
              {data.role !== 'viewer' && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Miembros e invitaciones
                    </p>
                    <p className="text-sm text-slate-500">
                      Crea un enlace y compártelo para sumar personas a este
                      tablero.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-sm text-slate-600">
                      <span>Rol</span>
                      <select
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(
                            event.target.value as 'editor' | 'viewer',
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm text-slate-600">
                      <span>Duración (horas)</span>
                      <input
                        type="number"
                        min={1}
                        value={inviteTtlHours}
                        onChange={(event) =>
                          setInviteTtlHours(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  </div>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span>Teléfono (opcional)</span>
                    <input
                      type="text"
                      value={invitePhoneNumber}
                      onChange={(event) =>
                        setInvitePhoneNumber(event.target.value)
                      }
                      placeholder="Ej: +593999999999"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void createInvitationLink();
                    }}
                    disabled={createInvitationMutation.isPending}
                    className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {createInvitationMutation.isPending
                      ? 'Creando...'
                      : 'Crear enlace de invitación'}
                  </button>

                  {inviteSuccess && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {inviteSuccess}
                    </p>
                  )}
                  {inviteError && (
                    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {inviteError}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Invitaciones pendientes ({pendingInvitations.length})
                    </p>
                    {invitationsQuery.isPending ? (
                      <p className="text-sm text-slate-500">
                        Cargando invitaciones...
                      </p>
                    ) : pendingInvitations.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No hay invitaciones pendientes.
                      </p>
                    ) : (
                      pendingInvitations.slice(0, 8).map((invitation) => (
                        <div
                          key={invitation.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-medium text-slate-800">
                            {invitation.invitedPhoneNumber ||
                              'Enlace compartido'}
                          </p>
                          <p className="text-xs text-slate-500">
                            rol {invitation.targetRole}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void revokeInvitationById(invitation.id);
                            }}
                            disabled={revokeInvitationMutation.isPending}
                            className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                          >
                            Eliminar invitación
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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
              <BoardSelectorCard
                boards={data.boards}
                activeBoardId={data.board.id}
                onBoardTap={openBoardDetails}
              />
              {data.role !== 'viewer' && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      Miembros e invitaciones
                    </p>
                    <p className="text-sm text-slate-500">
                      Puedes invitar personas incluso usando sesión anónima.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-sm text-slate-600">
                      <span>Rol</span>
                      <select
                        value={inviteRole}
                        onChange={(event) =>
                          setInviteRole(
                            event.target.value as 'editor' | 'viewer',
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>
                    <label className="space-y-1 text-sm text-slate-600">
                      <span>Duración (horas)</span>
                      <input
                        type="number"
                        min={1}
                        value={inviteTtlHours}
                        onChange={(event) =>
                          setInviteTtlHours(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  </div>
                  <label className="space-y-1 text-sm text-slate-600">
                    <span>Teléfono (opcional)</span>
                    <input
                      type="text"
                      value={invitePhoneNumber}
                      onChange={(event) =>
                        setInvitePhoneNumber(event.target.value)
                      }
                      placeholder="Ej: +593999999999"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void createInvitationLink();
                    }}
                    disabled={createInvitationMutation.isPending}
                    className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {createInvitationMutation.isPending
                      ? 'Creando...'
                      : 'Crear enlace de invitación'}
                  </button>
                  {inviteSuccess && (
                    <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {inviteSuccess}
                    </p>
                  )}
                  {inviteError && (
                    <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {inviteError}
                    </p>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">
                      Invitaciones pendientes ({pendingInvitations.length})
                    </p>
                    {invitationsQuery.isPending ? (
                      <p className="text-sm text-slate-500">
                        Cargando invitaciones...
                      </p>
                    ) : pendingInvitations.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No hay invitaciones pendientes.
                      </p>
                    ) : (
                      pendingInvitations.slice(0, 8).map((invitation) => (
                        <div
                          key={invitation.id}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-medium text-slate-800">
                            {invitation.invitedPhoneNumber ||
                              'Enlace compartido'}
                          </p>
                          <p className="text-xs text-slate-500">
                            rol {invitation.targetRole}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              void revokeInvitationById(invitation.id);
                            }}
                            disabled={revokeInvitationMutation.isPending}
                            className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-60"
                          >
                            Eliminar invitación
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
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

      <Drawer
        open={isIncomeDrawerOpen}
        onOpenChange={handleIncomeDrawerOpenChange}
      >
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle>Detalle del ingreso</DrawerTitle>
            <DrawerDescription>
              Puedes revisar, editar o eliminar este ingreso.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {!selectedIncome ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No encontramos ese ingreso. Cierra e intenta nuevamente.
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {currencyFormatter.format(selectedIncome.amount)}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Categoría:</span>{' '}
                  {selectedIncome.categoryEmoji} {selectedIncome.categoryName}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Fecha:</span>{' '}
                  {dayjs(selectedIncome.date).format('D MMM YYYY')}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Nota:</span>{' '}
                  {selectedIncome.note ?? 'Sin nota'}
                </p>
              </div>
            )}

            {showDeleteIncomeConfirm && selectedIncome && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Esta acción eliminará el ingreso del tablero. Puedes continuar
                solo si estás seguro.
              </div>
            )}

            {incomeActionError && (
              <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                {incomeActionError}
              </p>
            )}
          </div>

          <DrawerFooter className="pb-8">
            {!selectedIncome ? (
              <DrawerClose asChild>
                <button
                  type="button"
                  className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>
              </DrawerClose>
            ) : showDeleteIncomeConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void deleteSelectedIncome();
                  }}
                  disabled={deleteIncomeMutation.isPending}
                  className="w-full rounded-[20px] bg-rose-600 py-4 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {deleteIncomeMutation.isPending
                    ? 'Eliminando...'
                    : 'Si, eliminar ingreso'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteIncomeConfirm(false);
                    setIncomeActionError(null);
                  }}
                  disabled={deleteIncomeMutation.isPending}
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
                      to: `/incomes/${selectedIncome.id}/edit` as never,
                    });
                    handleIncomeDrawerOpenChange(false);
                    setIncomeActionError(null);
                    setShowDeleteIncomeConfirm(false);
                  }}
                  className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Editar ingreso
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteIncomeConfirm(true);
                    setIncomeActionError(null);
                  }}
                  className="w-full rounded-[20px] border border-rose-300 bg-rose-50 py-4 text-base font-semibold text-rose-700 transition-all active:scale-[0.98]"
                >
                  Eliminar ingreso
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

      <Drawer
        open={isBoardDrawerOpen}
        onOpenChange={handleBoardDrawerOpenChange}
      >
        <DrawerContent>
          <DrawerHeader className="pb-2">
            <DrawerTitle>Detalle del tablero</DrawerTitle>
            <DrawerDescription>
              Revisa los detalles de este tablero, selecciónalo o edítalo.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {!selectedBoardForDrawer ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No encontramos ese tablero. Cierra e intenta nuevamente.
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-2xl font-semibold tracking-tight text-slate-950">
                  {selectedBoardForDrawer.name}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">Rol:</span>{' '}
                  {roleLabels[selectedBoardForDrawer.role] ??
                    selectedBoardForDrawer.role}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-800">
                    Límite de gasto:
                  </span>{' '}
                  {selectedBoardForDrawer.spendingLimitAmount
                    ? currencyFormatter.format(
                        Number(selectedBoardForDrawer.spendingLimitAmount),
                      )
                    : 'Sin límite'}
                </p>
                {selectedBoardForDrawer.id === data?.board.id && (
                  <span className="inline-block rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                    Tablero activo
                  </span>
                )}
              </div>
            )}

            {showDeleteBoardConfirm && selectedBoardForDrawer && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Se eliminarán todos los gastos e ingresos de este tablero. Esta
                acción no se puede deshacer.
              </div>
            )}

            {boardActionError && (
              <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
                {boardActionError}
              </p>
            )}
          </div>

          <DrawerFooter className="pb-8">
            {!selectedBoardForDrawer ? (
              <DrawerClose asChild>
                <button
                  type="button"
                  className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>
              </DrawerClose>
            ) : showDeleteBoardConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void deleteSelectedBoard();
                  }}
                  disabled={deleteBoardMutation.isPending}
                  className="w-full rounded-[20px] bg-rose-600 py-4 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {deleteBoardMutation.isPending
                    ? 'Eliminando...'
                    : 'Sí, eliminar tablero'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteBoardConfirm(false);
                    setBoardActionError(null);
                  }}
                  disabled={deleteBoardMutation.isPending}
                  className="w-full rounded-[20px] border border-slate-300 bg-white py-4 text-base font-semibold text-slate-700 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {selectedBoardForDrawer.id !== data?.board.id && (
                  <button
                    type="button"
                    onClick={selectBoardFromDrawer}
                    className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98]"
                  >
                    Seleccionar tablero
                  </button>
                )}
                {selectedBoardForDrawer.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate({
                        to: `/boards/${selectedBoardForDrawer.id}/edit` as never,
                      });
                      handleBoardDrawerOpenChange(false);
                    }}
                    className="w-full rounded-[20px] border border-slate-300 bg-white py-4 text-base font-semibold text-slate-700 transition-all active:scale-[0.98]"
                  >
                    Editar tablero
                  </button>
                )}
                {selectedBoardForDrawer.role === 'owner' &&
                  data &&
                  data.boards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteBoardConfirm(true);
                        setBoardActionError(null);
                      }}
                      className="w-full rounded-[20px] border border-rose-300 bg-rose-50 py-4 text-base font-semibold text-rose-700 transition-all active:scale-[0.98]"
                    >
                      Eliminar tablero
                    </button>
                  )}
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

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-6 py-6 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-5 items-center">
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

          <div className="col-span-3 flex items-center justify-center gap-3">
            <Link
              to="/add/income"
              search={(current) => current}
              params={(current) => current}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-white text-emerald-600 shadow-sm transition-all hover:bg-emerald-50 active:scale-95"
              aria-label="Agregar ingreso"
            >
              <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
            </Link>
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

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setView('stats')}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
                view === 'stats'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                  : 'border-transparent text-slate-400 hover:bg-slate-50'
              }`}
              aria-label="Ver estadísticas"
            >
              <BarChart3 className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={() => {
                setView(anonymousId ? 'settings' : 'profile');
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
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
        </div>
      </nav>
    </div>
  );
}
