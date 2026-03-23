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
      // Save anonymousId BEFORE processing the callback
      const previousAnonymousId = window.localStorage.getItem('anonymousId');

      // Save local expenses/incomes/board before they're lost
      const expensesBefore = getLocalExpenses();
      const incomesBefore = getLocalIncomes();
      const boardBefore = getLocalBoard();

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
      }

      await finishAuthFromCallback(new URLSearchParams(window.location.search));

      return previousAnonymousId;
    },
    onSuccess: (_previousAnonymousId) => {
      // OAuth completed successfully - DON'T remove pendingClaimAnonymousId here
      // The index.tsx page needs it to trigger the claim migration flow
      // Just clear the auth challenge
      window.localStorage.removeItem('auth_challenge');

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
