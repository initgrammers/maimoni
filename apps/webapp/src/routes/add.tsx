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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="px-5 pt-8 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white tracking-tight">
          Nuevo movimiento
        </h1>
        <Link
          to="/"
          search={(current) => current}
          params={(current) => current}
          className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center active:scale-95 transition-transform"
        >
          <X className="w-5 h-5 text-slate-400" />
        </Link>
      </header>

      <main className="px-5 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Tipo
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setSelectedCategory(null);
                }}
                className={`relative overflow-hidden rounded-2xl p-4 font-bold transition-all active:scale-95 ${
                  type === 'expense'
                    ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xl shadow-rose-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50'
                }`}
              >
                {type === 'expense' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                )}
                <span className="relative">Gasto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setSelectedCategory(null);
                }}
                className={`relative overflow-hidden rounded-2xl p-4 font-bold transition-all active:scale-95 ${
                  type === 'income'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50'
                }`}
              >
                {type === 'income' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                )}
                <span className="relative">Ingreso</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor={amountInputId}
              className="block text-sm font-semibold text-slate-400 uppercase tracking-wider"
            >
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-600">
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
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl pl-12 pr-5 py-5 text-3xl font-black text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Categoría
            </p>
            {!showCategories && !selectedCategory && (
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 text-left text-slate-500 font-medium active:scale-[0.98] transition-all"
              >
                Seleccionar categoría
              </button>
            )}
            {!showCategories && selectedCategory && (
              <button
                type="button"
                onClick={() => setShowCategories(true)}
                className="w-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/50 rounded-2xl p-5 flex items-center justify-between active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCategory.emoji}</span>
                  <span className="font-bold text-white">
                    {selectedCategory.name}
                  </span>
                </div>
                <Check className="w-5 h-5 text-violet-400" />
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
                    className={`w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98] ${
                      selectedCategory?.id === category.id
                        ? 'bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/50'
                        : 'bg-slate-800/60 border border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="font-semibold text-white">
                      {category.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label
              htmlFor={noteInputId}
              className="block text-sm font-semibold text-slate-400 uppercase tracking-wider"
            >
              Nota (opcional)
            </label>
            <input
              id={noteInputId}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Almuerzo con el equipo"
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Escanear recibo
            </p>
            <button
              type="button"
              className="w-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-all hover:border-violet-500/50"
            >
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                <Scan className="w-7 h-7 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white mb-1">IA Scan</p>
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
              className="w-full bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl py-5 font-black text-white text-lg shadow-xl shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              Guardar movimiento
            </button>
            <Link
              to="/"
              search={(current) => current}
              params={(current) => current}
              className="block w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl py-5 font-bold text-slate-400 text-center active:scale-[0.98] transition-all"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
