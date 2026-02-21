import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Loader2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { getApiBase } from '../lib/openauth';
import { requireClientAuth } from '../lib/route-guards';

type BoardDetail = {
  id: string;
  name: string;
  spendingLimitAmount: string | null;
};

const API_BASE = getApiBase();
const dashboardQueryKey = (accessToken: string) =>
  ['dashboard', accessToken] as const;
const boardQueryKey = (accessToken: string, boardId: string) =>
  ['board', accessToken, boardId] as const;

export const Route = createFileRoute('/boards/$boardId/edit' as never)({
  beforeLoad: () => {
    requireClientAuth();
  },
  component: EditBoard,
});

async function fetchBoard(
  accessToken: string,
  boardId: string,
): Promise<BoardDetail> {
  const response = await fetch(`${API_BASE}/api/dashboard?boardId=${boardId}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo cargar el tablero');
  }

  const data = (await response.json()) as {
    board: BoardDetail;
  };
  return data.board;
}

async function updateBoardSettings(
  accessToken: string,
  boardId: string,
  payload: {
    name: string;
    spendingLimitAmount: string | null;
  },
) {
  const response = await fetch(`${API_BASE}/api/boards/${boardId}/settings`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      result?.error ?? 'No se pudo actualizar la configuración del tablero',
    );
  }
}

function EditBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nameInputId = useId();
  const limitInputId = useId();
  const { boardId } = Route.useParams();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [spendingLimit, setSpendingLimit] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccessToken(window.localStorage.getItem('accessToken'));
  }, []);

  const boardQuery = useQuery<BoardDetail, Error>({
    queryKey: accessToken
      ? boardQueryKey(accessToken, boardId)
      : (['board', 'guest', boardId] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return fetchBoard(accessToken, boardId);
    },
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (!boardQuery.data) {
      return;
    }

    setName(boardQuery.data.name);
    setSpendingLimit(boardQuery.data.spendingLimitAmount ?? '');
  }, [boardQuery.data]);

  const updateMutation = useMutation<
    void,
    Error,
    {
      name: string;
      spendingLimitAmount: string | null;
    }
  >({
    mutationFn: async (payload) => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return updateBoardSettings(accessToken, boardId, payload);
    },
    onSuccess: async () => {
      if (accessToken) {
        await queryClient.invalidateQueries({
          queryKey: dashboardQueryKey(accessToken),
        });
      }

      navigate({
        to: '/' as never,
      });
    },
  });

  const loadingMessage = useMemo(() => {
    if (boardQuery.isPending) {
      return 'Cargando datos del tablero...';
    }

    return null;
  }, [boardQuery.isPending]);

  const submitDisabled =
    !name.trim() || updateMutation.isPending || boardQuery.isPending;

  function normalizeAmount(value: string) {
    return value.trim().replace(',', '.');
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ingresa un nombre para el tablero');
      return;
    }

    let parsedLimit: string | null = null;
    const limitValue = normalizeAmount(spendingLimit);

    if (limitValue) {
      if (!/^\d+(\.\d{1,2})?$/.test(limitValue)) {
        setError('Ingresa un monto válido con hasta 2 decimales');
        return;
      }
      parsedLimit = limitValue;
    }

    setError(null);

    try {
      await updateMutation.mutateAsync({
        name: trimmedName,
        spendingLimitAmount: parsedLimit,
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar el tablero',
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pb-6 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Editar tablero
        </h1>
        <Link
          to="/"
          search={(current) => current}
          params={(current) => current}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white transition-transform active:scale-95"
        >
          <X className="h-5 w-5 text-slate-500" />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md px-5 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {loadingMessage && (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingMessage}
            </div>
          )}

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <label
              htmlFor={nameInputId}
              className="block text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Nombre del tablero
            </label>
            <input
              id={nameInputId}
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Ej: Personal, Hogar, Empresa"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-medium text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              disabled={updateMutation.isPending || boardQuery.isPending}
            />
          </div>

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <label
              htmlFor={limitInputId}
              className="block text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Límite de gasto
            </label>
            <p className="text-xs text-slate-400">
              Define un monto máximo mensual. Déjalo vacío para quitar el
              límite.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-slate-400">$</span>
              <input
                id={limitInputId}
                type="text"
                inputMode="decimal"
                value={spendingLimit}
                onChange={(event) => {
                  setSpendingLimit(event.target.value);
                }}
                placeholder="250.00"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-lg font-medium text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                disabled={updateMutation.isPending || boardQuery.isPending}
              />
            </div>
            {spendingLimit && (
              <button
                type="button"
                onClick={() => {
                  setSpendingLimit('');
                }}
                className="text-sm font-medium text-slate-500 underline transition-colors hover:text-slate-700"
              >
                Quitar límite
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {boardQuery.isError && (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {boardQuery.error.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full rounded-[20px] bg-slate-900 py-4 text-base font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </main>
    </div>
  );
}
