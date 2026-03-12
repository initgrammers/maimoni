import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getLocalExpenses } from '../lib/expense-service';
import { getLocalIncomes } from '../lib/income-service';
import { finishAuthFromCallback } from '../lib/openauth';
import { getLocalBoard } from '../lib/storage-types';

export const Route = createFileRoute('/callback/auth' as never)({
  component: AuthCallback,
});

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  const callbackMutation = useMutation({
    mutationFn: async () => {
      // DEBUG: Check local data before anything
      const expensesBefore = getLocalExpenses();
      const incomesBefore = getLocalIncomes();
      const boardBefore = getLocalBoard();
      console.log('[callback] Local expenses BEFORE:', expensesBefore);
      console.log('[callback] Local incomes BEFORE:', incomesBefore);
      console.log('[callback] Local board BEFORE:', boardBefore);

      // Save anonymousId BEFORE processing the callback
      const previousAnonymousId = window.localStorage.getItem('anonymousId');
      console.log('[callback] previousAnonymousId:', previousAnonymousId);

      // Save local expenses/incomes/board before they're lost
      if (
        expensesBefore.length > 0 ||
        incomesBefore.length > 0 ||
        boardBefore.name
      ) {
        window.localStorage.setItem(
          'pendingLocalExpenses',
          JSON.stringify(expensesBefore),
        );
        window.localStorage.setItem(
          'pendingLocalIncomes',
          JSON.stringify(incomesBefore),
        );
        window.localStorage.setItem(
          'pendingLocalBoard',
          JSON.stringify(boardBefore),
        );
        console.log('[callback] Saved pending data:', {
          expenses: expensesBefore.length,
          incomes: incomesBefore.length,
          board: boardBefore.name,
        });
      } else {
        console.log('[callback] No local data to save');
      }

      await finishAuthFromCallback(new URLSearchParams(window.location.search));

      return previousAnonymousId;
    },
    onSuccess: (previousAnonymousId) => {
      console.log(
        '[callback] onSuccess, previousAnonymousId:',
        previousAnonymousId,
      );
      console.log(
        '[callback] pendingLocalExpenses:',
        window.localStorage.getItem('pendingLocalExpenses'),
      );
      console.log(
        '[callback] pendingLocalIncomes:',
        window.localStorage.getItem('pendingLocalIncomes'),
      );

      // If there was an anonymous user before login, set pendingClaimAnonymousId
      // to trigger data migration after login
      if (previousAnonymousId) {
        window.localStorage.setItem(
          'pendingClaimAnonymousId',
          previousAnonymousId,
        );
        console.log(
          '[callback] Set pendingClaimAnonymousId:',
          previousAnonymousId,
        );
      }

      const pendingInviteToken =
        window.localStorage.getItem('pendingInviteToken');
      if (pendingInviteToken) {
        window.localStorage.removeItem('pendingInviteToken');
        window.location.href = `/invite?token=${encodeURIComponent(pendingInviteToken)}`;
        return;
      }

      window.location.href = '/';
    },
    onError: () => {
      setError('No se pudo completar la autenticación');
    },
  });

  const { mutate, isPending } = callbackMutation;

  useEffect(() => {
    mutate();
  }, [mutate]);

  return (
    <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <p className="text-sm text-slate-500">
          {error ??
            (isPending
              ? 'Completando autenticación...'
              : 'Validando sesión...')}
        </p>
      </div>
    </div>
  );
}
