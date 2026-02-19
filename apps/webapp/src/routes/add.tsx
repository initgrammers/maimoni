import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import {
  Calendar as CalendarIcon,
  Camera,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
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
import type { Category, MovementType, Subcategory } from '../types';

const API_BASE = getApiBase();
const dashboardQueryKey = (accessToken: string) =>
  ['dashboard', accessToken] as const;
const categoriesQueryKey = (accessToken: string, type: MovementType) =>
  ['categories', accessToken, type] as const;

export const Route = createFileRoute('/add' as never)({
  beforeLoad: () => {
    requireClientAuth();
  },
  component: AddMovement,
});

async function fetchCategories(accessToken: string, type: MovementType) {
  const response = await fetch(`${API_BASE}/api/categories?type=${type}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudieron cargar las categorías');
  }

  return (await response.json()) as Category[];
}

async function fetchDashboard(accessToken: string) {
  const response = await fetch(`${API_BASE}/api/dashboard`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo obtener el tablero');
  }

  return (await response.json()) as { board: { id: string } };
}

async function scanReceipt(accessToken: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'Error al escanear el recibo');
  }

  return (await response.json()) as ScanResponse;
}

interface ScanResponse {
  total_amount: number;
  date: string;
  merchant_name: string;
  category: string;
  type: 'expense' | 'income';
  note: string;
  items: Array<{ name: string; price: number }>;
}

dayjs.locale('es');

function AddMovement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const amountInputId = useId();
  const dateInputId = useId();
  const noteInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem('accessToken');
  });
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [month, setMonth] = useState<Date>(() => new Date(`${date}T12:00:00`));

  useEffect(() => {
    setMonth(new Date(`${date}T12:00:00`));
  }, [date]);

  const [type, setType] = useState<MovementType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<Subcategory | null>(null);
  const [note, setNote] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingScanCategory, setPendingScanCategory] = useState<string | null>(
    null,
  );

  const categoriesQuery = useQuery<Category[], Error>({
    queryKey: accessToken
      ? categoriesQueryKey(accessToken, type)
      : (['categories', 'guest', type] as const),
    queryFn: () => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return fetchCategories(accessToken, type);
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });

  const categories = categoriesQuery.data ?? [];
  const isCategoriesLoading = Boolean(accessToken) && categoriesQuery.isPending;

  const scanMutation = useMutation<ScanResponse, Error, File>({
    mutationFn: (file) => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      return scanReceipt(accessToken, file);
    },
  });

  const createMovementMutation = useMutation<
    void,
    Error,
    {
      movementType: MovementType;
      amount: string;
      categoryId: string;
      note?: string;
      date: string;
    }
  >({
    mutationFn: async ({ movementType, amount, categoryId, note, date }) => {
      if (!accessToken) {
        throw new Error('No hay sesión activa');
      }

      const dashboard = await queryClient.fetchQuery({
        queryKey: dashboardQueryKey(accessToken),
        queryFn: () => fetchDashboard(accessToken),
      });

      const response = await fetch(`${API_BASE}/api/${movementType}s`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          boardId: dashboard.board.id,
          amount,
          categoryId,
          note,
          date,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(result?.error ?? `Error al guardar ${movementType}`);
      }
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

  useEffect(() => {
    if (!pendingScanCategory || categories.length === 0) return;

    const matched = categories.find(
      (cat) => cat.name.toLowerCase() === pendingScanCategory.toLowerCase(),
    );
    if (matched) {
      setSelectedCategory(matched);
    }
    setPendingScanCategory(null);
  }, [categories, pendingScanCategory]);

  const handleScanFile = async (file: File) => {
    if (!accessToken) return;

    setError(null);

    try {
      const result = await scanMutation.mutateAsync(file);

      setAmount(result.total_amount.toString());
      if (result.date) {
        try {
          const parsedDate = new Date(result.date);
          if (!Number.isNaN(parsedDate.getTime())) {
            setDate(parsedDate.toISOString().split('T')[0]);
          }
        } catch (e) {
          console.error('Error al parsear la fecha escaneada:', e);
        }
      }
      setNote(result.note || result.merchant_name || '');

      if (result.type !== type) {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        setShowCategories(false);
        setShowSubcategories(false);
        setType(result.type);
        setPendingScanCategory(result.category);
      } else {
        const matched = categories.find(
          (cat) => cat.name.toLowerCase() === result.category.toLowerCase(),
        );
        if (matched) {
          setSelectedCategory(matched);
          setShowCategories(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al escanear');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedCategory) return;

    if (!accessToken) {
      setError('No hay sesión activa');
      return;
    }

    setError(null);

    try {
      await createMovementMutation.mutateAsync({
        movementType: type,
        amount,
        categoryId: selectedSubcategory?.id || selectedCategory.id,
        note: note || undefined,
        date: new Date(`${date}T12:00:00`).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-900">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pb-6 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Nuevo movimiento
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScanFile(file);
            }}
          />

          <button
            type="button"
            disabled={scanMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-violet-300 bg-violet-50 p-5 font-semibold text-violet-700 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analizando recibo...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                Escanear recibo
              </>
            )}
          </button>

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Tipo
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
                className={`rounded-2xl border p-4 font-semibold transition-all active:scale-95 ${
                  type === 'expense'
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                }}
                className={`rounded-2xl border p-4 font-semibold transition-all active:scale-95 ${
                  type === 'income'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                Ingreso
              </button>
            </div>
          </div>

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
                  <div className="flex items-center justify-between">
                    <DrawerTitle className="text-xl font-bold">
                      Seleccionar fecha
                    </DrawerTitle>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(
                          2,
                          '0',
                        );
                        const day = String(now.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        setDate(dateStr);
                        setMonth(new Date(`${dateStr}T12:00:00`));
                      }}
                      className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-all active:scale-95 hover:bg-slate-200"
                    >
                      Hoy
                    </button>
                  </div>
                </DrawerHeader>
                <div className="flex justify-center p-4">
                  <Calendar
                    mode="single"
                    selected={date ? new Date(`${date}T00:00:00`) : undefined}
                    onSelect={(newDate) => {
                      if (newDate) {
                        const year = newDate.getFullYear();
                        const month = String(newDate.getMonth() + 1).padStart(
                          2,
                          '0',
                        );
                        const day = String(newDate.getDate()).padStart(2, '0');
                        setDate(`${year}-${month}-${day}`);
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
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                disabled={isCategoriesLoading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left font-medium text-slate-500 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isCategoriesLoading ? 'Cargando...' : 'Seleccionar categoría'}
              </button>
            )}
            {!showCategories && selectedCategory && (
              <button
                type="button"
                onClick={() => {
                  setShowCategories(true);
                }}
                disabled={isCategoriesLoading}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 p-5 transition-all active:scale-[0.98] disabled:opacity-50"
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
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {isCategoriesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-500">
                    No hay categorías disponibles.
                  </p>
                ) : (
                  categories.map((category) => (
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
                  ))
                )}
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
                  <div className="space-y-2 max-h-80 overflow-y-auto">
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
                    {selectedCategory.subcategories.map((sub) => (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubcategory(sub);
                          setShowSubcategories(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                          selectedSubcategory?.id === sub.id
                            ? 'border-slate-300 bg-slate-100'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl">{sub.emoji}</span>
                        <span className="font-semibold text-slate-800">
                          {sub.name}
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
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Almuerzo con el equipo"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-900 placeholder:text-slate-400 transition-all focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-600">
              {error}
            </div>
          )}

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={
                !amount || !selectedCategory || createMovementMutation.isPending
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-5 text-lg font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMovementMutation.isPending && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {createMovementMutation.isPending
                ? 'Guardando...'
                : 'Guardar movimiento'}
            </button>
            <Link
              to="/"
              search={(current) => current}
              params={(current) => current}
              className="block w-full rounded-2xl border border-slate-300 bg-white py-5 text-center font-semibold text-slate-600 transition-all active:scale-[0.98]"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
