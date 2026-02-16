import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { getCategoryById } from '../data/categories';
import type { Movement } from '../types';

export const Route = createFileRoute('/' as never)({
  component: Dashboard,
});

const MOCK_MOVEMENTS: Movement[] = [
  {
    id: '1',
    amount: 3500,
    type: 'income',
    category: getCategoryById('salary')!,
    date: new Date('2026-02-15'),
    note: 'Salario febrero',
    userId: '1',
    userName: 'Henry',
  },
  {
    id: '2',
    amount: 45.5,
    type: 'expense',
    category: getCategoryById('food')!,
    subcategory: { id: 'restaurants', name: 'Restaurantes', emoji: '🍽️' },
    date: new Date('2026-02-16T13:30:00'),
    note: 'Almuerzo con el equipo',
    userId: '1',
    userName: 'Henry',
  },
  {
    id: '3',
    amount: 120.0,
    type: 'expense',
    category: getCategoryById('shopping')!,
    subcategory: { id: 'clothes', name: 'Ropa/Calzado', emoji: '👕' },
    date: new Date('2026-02-16T10:15:00'),
    userId: '2',
    userName: 'María',
  },
  {
    id: '4',
    amount: 15.0,
    type: 'expense',
    category: getCategoryById('transport')!,
    subcategory: { id: 'rideshare', name: 'Uber/Didi', emoji: '🚕' },
    date: new Date('2026-02-15T19:20:00'),
    userId: '1',
    userName: 'Henry',
  },
  {
    id: '5',
    amount: 89.99,
    type: 'expense',
    category: getCategoryById('food')!,
    subcategory: { id: 'supermarket', name: 'Supermercados', emoji: '🛒' },
    date: new Date('2026-02-14'),
    note: 'Compras semanales',
    userId: '2',
    userName: 'María',
  },
];

function Dashboard() {
  const totalIncome = MOCK_MOVEMENTS.filter((m) => m.type === 'income').reduce(
    (sum, m) => sum + m.amount,
    0,
  );
  const totalExpenses = MOCK_MOVEMENTS.filter(
    (m) => m.type === 'expense',
  ).reduce((sum, m) => sum + m.amount, 0);
  const balance = totalIncome - totalExpenses;

  const groupedMovements = MOCK_MOVEMENTS.reduce(
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
    {} as Record<string, Movement[]>,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              maimonei
            </h1>
          </div>
          <Link
            to="/add"
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-violet-500/10" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-400 mb-2 tracking-wide uppercase">
              Balance Disponible
            </p>
            <p className="text-5xl font-black text-white mb-6 tracking-tight">
              ${balance.toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Ingresos</p>
                  <p className="text-lg font-bold text-emerald-400">
                    ${totalIncome.toFixed(2)}
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
                    ${totalExpenses.toFixed(2)}
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
          {Object.entries(groupedMovements).map(([date, movements]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
                {date}
              </p>
              <div className="space-y-2">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="group relative overflow-hidden rounded-2xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-4 active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl flex-shrink-0">
                        {movement.subcategory?.emoji || movement.category.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-white truncate">
                            {movement.subcategory?.name ||
                              movement.category.name}
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
                          <span>{movement.userName}</span>
                          <span>•</span>
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
