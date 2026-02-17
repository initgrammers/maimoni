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
    <div className="min-h-screen bg-slate-950 text-white px-5 py-10">
      <div className="max-w-md mx-auto space-y-4">
        <p className="text-slate-300 text-sm">
          {error ?? 'Completando autenticacion...'}
        </p>
      </div>
    </div>
  );
}
