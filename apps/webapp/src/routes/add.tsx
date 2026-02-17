import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Check, Scan, X } from 'lucide-react';
import { useId, useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/categories';
import { requireClientAuth } from '../lib/route-guards';
import type { Category, MovementType } from '../types';

export const Route = createFileRoute('/add' as never)({
  beforeLoad: () => {
    requireClientAuth();
  },
  component: AddMovement,
});

function AddMovement() {
  const navigate = useNavigate();
  const amountInputId = useId();
  const noteInputId = useId();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<MovementType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const categories =
    type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ amount, type, category: selectedCategory, note });
    navigate({
      to: '/',
      search: (current) => current,
      params: (current) => current,
    });
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
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category);
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

          <div className="space-y-3 rounded-[28px] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Escanear recibo
            </p>
            <button
              type="button"
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 transition-all active:scale-[0.98] hover:border-slate-400"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200">
                <Scan className="h-7 w-7 text-slate-600" />
              </div>
              <div className="text-center">
                <p className="mb-1 font-semibold text-slate-800">IA Scan</p>
                <p className="text-sm text-slate-500">
                  Sube una foto y detectaremos el monto automáticamente
                </p>
              </div>
            </button>
          </div>

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={!amount || !selectedCategory}
              className="w-full rounded-2xl bg-slate-900 py-5 text-lg font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar movimiento
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
