import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { finishAuthFromCallback } from '../lib/openauth';

export const Route = createFileRoute('/callback/auth' as never)({
  component: AuthCallback,
});

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  const callbackMutation = useMutation({
    mutationFn: () =>
      finishAuthFromCallback(new URLSearchParams(window.location.search)),
    onSuccess: () => {
      const pendingInviteToken =
        window.localStorage.getItem('pendingInviteToken');
      if (pendingInviteToken) {
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
