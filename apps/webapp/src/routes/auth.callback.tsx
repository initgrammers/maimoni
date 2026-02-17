import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { finishAuthFromCallback } from '../lib/openauth';

export const Route = createFileRoute('/auth/callback' as never)({
  component: AuthCallback,
});

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      try {
        await finishAuthFromCallback(
          new URLSearchParams(window.location.search),
        );
        window.location.href = '/';
      } catch {
        setError('No se pudo completar la autenticacion');
      }
    }

    void run();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <p className="text-sm text-slate-500">
          {error ?? 'Completando autenticacion...'}
        </p>
      </div>
    </div>
  );
}
