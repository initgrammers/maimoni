import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { Calendar as CalendarIcon, Check, Loader2, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Calendar } from '../components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../components/ui/drawer';
import { getApiBase } from '../lib/openauth';
import { requireClientAuth } from '../lib/route-guards';
import type { Category, Subcategory } from '../types';

type ExpenseDetail = {
  id: string;
  amount: string;
  categoryId: string;
  note: string | null;
  date: string;
};

const API_BASE = getApiBase();

/**
 * Formatea el input de monto para permitir solo números con máximo 2 decimales.
 * Reemplaza comas por puntos y limita los caracteres válidos.
 */
function formatAmountInput(value: string): string {
  // Reemplazar comas por puntos
  let cleaned = value.replace(/,/g, '.');
  // Eliminar todo excepto números y un punto decimal
  cleaned = cleaned.replace(/[^\d.]/g, '');
  // Evitar múltiples puntos decimales
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
  }
  // Limitar a 2 decimales
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
  }
  return cleaned;
}

const dashboardQueryKey = (accessToken: string) =>
  ['dashboard', accessToken] as const;
const categoriesQueryKey = (accessToken: string) =>
  ['categories', accessToken, 'expense'] as const;
const expenseQueryKey = (accessToken: string, expenseId: string) =>
  ['expense', accessToken, expenseId] as const;

dayjs.locale('es');

export const Route = createFileRoute('/expenses/$expenseId/edit' as never)({
  beforeLoad: () => {
    requireClientAuth();
  },
  component: EditExpense,
});

async function fetchCategories(accessToken: string) {
  const response = await fetch(`${API_BASE}/api/categories?type=expense`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las categorías');
  }

  return (await response.json()) as Category[];
}

async function fetchExpense(accessToken: string, expenseId: string) {
  const response = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo cargar el gasto');
  }

  return (await response.json()) as ExpenseDetail;
}

async function updateExpense(
  accessToken: string,
  expenseId: string,
  payload: {
    amount: string;
    categoryId: string;
    note: string | null;
    date: string;
  },
) {
  const response = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
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
    throw new Error(result?.error ?? 'No se pudo actualizar el gasto');
  }
}

function EditExpense() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const amountInputId = useId();
  const dateInputId = useId();
  const noteInputId = useId();
  const { expenseId } = Route.useParams();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [month, setMonth] = useState<Date>(() => new Date(`${date}T12:00:00`));
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializedCategory, setInitializedCategory] = useState(false);

  useEffect(() => {
    setMonth(new Date(`${date}T12:00:00`));
  }, [date]);

  useEffect(() => {
    setAccessToken(window.localStorage.getItem('accessToken'));
  }, []);

  const categoriesQuery = useQuery<Category[], Error>({
    queryKey: accessToken
      ? categoriesQueryKey(accessToken)
      : (['categories', 'guest', 'expense'] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return fetchCategories(accessToken);
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });

  const expenseQuery = useQuery<ExpenseDetail, Error>({
    queryKey: accessToken
      ? expenseQueryKey(accessToken, expenseId)
      : (['expense', 'guest', expenseId] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return fetchExpense(accessToken, expenseId);
    },
    enabled: Boolean(accessToken),
  });

  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    if (!expenseQuery.data) {
      return;
    }

    setAmount(expenseQuery.data.amount);
    setDate(dayjs(expenseQuery.data.date).format('YYYY-MM-DD'));
    setNote(expenseQuery.data.note ?? '');
  }, [expenseQuery.data]);

  useEffect(() => {
    if (initializedCategory || !expenseQuery.data || categories.length === 0) {
      return;
    }

    const directCategory = categories.find(
      (category) => category.id === expenseQuery.data?.categoryId,
    );

    if (directCategory) {
      setSelectedCategory(directCategory);
      setSelectedSubcategory(null);
      setInitializedCategory(true);
      return;
    }

    for (const category of categories) {
      const matchedSubcategory = category.subcategories?.find(
        (subcategory) => subcategory.id === expenseQuery.data?.categoryId,
      );

      if (matchedSubcategory) {
        setSelectedCategory(category);
        setSelectedSubcategory(matchedSubcategory);
        setInitializedCategory(true);
        return;
      }
    }
  }, [initializedCategory, expenseQuery.data, categories]);

  const updateMutation = useMutation<
    void,
    Error,
    {
      amount: string;
      categoryId: string;
      note: string | null;
      date: string;
    }
  >({
    mutationFn: async (payload) => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return updateExpense(accessToken, expenseId, payload);
    },
    onSuccess: async () => {
      if (accessToken) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: dashboardQueryKey(accessToken),
          }),
          queryClient.invalidateQueries({
            queryKey: expenseQueryKey(accessToken, expenseId),
          }),
        ]);
      }

      navigate({
        to: '/' as never,
      });
    },
  });

  const loadingMessage = useMemo(() => {
    if (expenseQuery.isPending || categoriesQuery.isPending) {
      return 'Cargando datos del gasto...';
    }

    return null;
  }, [expenseQuery.isPending, categoriesQuery.isPending]);

  const submitDisabled =
    !amount ||
    !selectedCategory ||
    updateMutation.isPending ||
    expenseQuery.isPending ||
    categoriesQuery.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCategory) {
      setError('Selecciona una categoría');
      return;
    }

    const normalizedAmount = amount.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setError('Ingresa un monto válido con hasta 2 decimales');
      return;
    }

    setError(null);

    try {
      await updateMutation.mutateAsync({
        amount: normalizedAmount,
        categoryId: selectedSubcategory?.id ?? selectedCategory.id,
        note: note.trim() ? note.trim() : null,
        date: new Date(`${date}T12:00:00`).toISOString(),
      });
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No se pudo actualizar el gasto',
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pb-6 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Editar gasto
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
              htmlFor={dateInputId}
              className="block text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Fecha
            </label>
            <Drawer>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left text-slate-900 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <span className="font-medium">
                    {date
                      ? dayjs(`${date}T12:00:00`).format('D MMM YYYY')
                      : 'Seleccionar fecha'}
                  </span>
                  <CalendarIcon className="h-5 w-5 text-slate-400" />
                </button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="text-xl font-bold">
                    Seleccionar fecha
                  </DrawerTitle>
                </DrawerHeader>
                <div className="flex justify-center p-4">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(`${date}T00:00:00`) : undefined}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(dayjs(newDate).format('YYYY-MM-DD'));
                      }
                    }}
                    month={month}
                    onMonthChange={setMonth}
                    className="w-full max-w-[350px]"
                  />
                </div>
                <DrawerFooter className="pb-8">
                  <DrawerClose asChild>
                    <button
                      type="button"
                      className="w-full rounded-[20px] bg-slate-900 py-5 text-lg font-bold text-white shadow-lg transition-all active:scale-[0.98]"
                    >
                      Confirmar
                    </button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <label
              htmlFor={amountInputId}
              className="block text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">
                $
              </span>
              <input
                id={amountInputId}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) =>
                  setAmount(formatAmountInput(event.target.value))
                }
                placeholder="0.00"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-5 py-5 text-3xl font-semibold text-slate-900 placeholder:text-slate-300 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Categoría
            </p>
            {!showCategories && !selectedCategory && (
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left font-medium text-slate-500 transition-all active:scale-[0.98]"
              >
                Seleccionar categoría
              </button>
            )}
            {!showCategories && selectedCategory && (
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 p-5 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCategory.emoji}</span>
                  <span className="font-semibold text-slate-800">
                    {selectedCategory.name}
                  </span>
                </div>
                <Check className="h-5 w-5 text-slate-500" />
              </button>
            )}
            {showCategories && (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedSubcategory(null);
                      setShowCategories(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                      selectedCategory?.id === category.id
                        ? 'border-slate-300 bg-slate-100'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="font-semibold text-slate-800">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCategory?.subcategories &&
            selectedCategory.subcategories.length > 0 && (
              <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Subcategoría (opcional)
                </p>
                {!showSubcategories && !selectedSubcategory && (
                  <button
                    type="button"
                    onClick={() => setShowSubcategories(true)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left font-medium text-slate-500 transition-all active:scale-[0.98]"
                  >
                    Seleccionar subcategoría
                  </button>
                )}
                {!showSubcategories && selectedSubcategory && (
                  <button
                    type="button"
                    onClick={() => setShowSubcategories(true)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 p-5 transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {selectedSubcategory.emoji}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedSubcategory.name}
                      </span>
                    </div>
                    <Check className="h-5 w-5 text-slate-500" />
                  </button>
                )}
                {showSubcategories && (
                  <div className="max-h-80 space-y-2 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubcategory(null);
                        setShowSubcategories(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 transition-all hover:bg-slate-50 active:scale-[0.98]"
                    >
                      <span className="text-xl">✨</span>
                      <span className="font-medium text-slate-500">
                        Ninguna (solo {selectedCategory.name})
                      </span>
                    </button>
                    {selectedCategory.subcategories.map((subcategory) => (
                      <button
                        type="button"
                        key={subcategory.id}
                        onClick={() => {
                          setSelectedSubcategory(subcategory);
                          setShowSubcategories(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                          selectedSubcategory?.id === subcategory.id
                            ? 'border-slate-300 bg-slate-100'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl">{subcategory.emoji}</span>
                        <span className="font-semibold text-slate-800">
                          {subcategory.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <label
              htmlFor={noteInputId}
              className="block text-sm font-semibold uppercase tracking-wider text-slate-500"
            >
              Nota (opcional)
            </label>
            <input
              id={noteInputId}
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ej: Almuerzo con el equipo"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-5 text-lg font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {updateMutation.isPending
                ? 'Guardando cambios...'
                : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => {
                navigate({ to: '/' as never });
              }}
              className="block w-full rounded-2xl border border-slate-300 bg-white py-5 text-center font-semibold text-slate-600 transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
