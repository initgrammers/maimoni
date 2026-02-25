import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { getApiBase, startAuth } from '../lib/openauth';

const API_BASE = getApiBase();

type InvitationPreview = {
  invitationId: string;
  boardId: string;
  boardName: string;
  targetRole: 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  expiresAt: string | null;
  inviterName: string | null;
};

export const Route = createFileRoute('/invite' as never)({
  component: InviteRoute,
});

async function resolveInvitation(token: string) {
  const response = await fetch(
    `${API_BASE}/api/invitations/resolve?token=${encodeURIComponent(token)}`,
    {
      headers: {
        authorization: `Bearer ${window.localStorage.getItem('accessToken') ?? ''}`,
      },
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo resolver la invitación');
  }

  return (await response.json()) as InvitationPreview;
}

async function acceptInvitation(token: string) {
  const accessToken = window.localStorage.getItem('accessToken');
  if (!accessToken) {
    throw new Error('Debes iniciar sesión para aceptar la invitación');
  }

  const response = await fetch(`${API_BASE}/api/invitations/accept`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo aceptar la invitación');
  }

  return (await response.json()) as { boardId: string };
}

async function declineInvitation(token: string) {
  const accessToken = window.localStorage.getItem('accessToken');
  if (!accessToken) {
    throw new Error('Debes iniciar sesión para rechazar la invitación');
  }

  const response = await fetch(`${API_BASE}/api/invitations/decline`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo rechazar la invitación');
  }
}

function InviteRoute() {
  const [message, setMessage] = useState<string | null>(null);

  const token = useMemo(() => {
    const searchToken = new URLSearchParams(window.location.search).get(
      'token',
    );
    return searchToken ?? window.localStorage.getItem('pendingInviteToken');
  }, []);

  const accessToken = window.localStorage.getItem('accessToken');

  const resolveQuery = useQuery<InvitationPreview, Error>({
    queryKey: token
      ? (['invitation-resolve', token] as const)
      : ['invitation-resolve', 'empty'],
    queryFn: () => {
      if (!token) {
        throw new Error('No encontramos el token de invitación');
      }

      return resolveInvitation(token);
    },
    enabled: Boolean(token && accessToken),
  });

  const acceptMutation = useMutation<
    { boardId: string },
    Error,
    { token: string }
  >({
    mutationFn: ({ token: nextToken }) => acceptInvitation(nextToken),
    onSuccess: ({ boardId }) => {
      window.localStorage.setItem('activeBoardId', boardId);
      window.localStorage.removeItem('pendingInviteToken');
      setMessage('Invitación aceptada. Redirigiendo...');
      window.location.href = '/';
    },
  });

  const declineMutation = useMutation<void, Error, { token: string }>({
    mutationFn: ({ token: nextToken }) => declineInvitation(nextToken),
    onSuccess: () => {
      window.localStorage.removeItem('pendingInviteToken');
      setMessage('Invitación rechazada');
    },
  });

  return (
    <div className="min-h-screen bg-[#f7f7f5] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-md rounded-[28px] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        {!token ? (
          <p className="text-sm text-rose-600">
            No encontramos un token de invitación válido.
          </p>
        ) : !accessToken ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Para aceptar esta invitación, primero inicia sesión o continúa
              como usuario anónimo.
            </p>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem('pendingInviteToken', token);
                void startAuth('anonymous');
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Continuar como anónimo
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem('pendingInviteToken', token);
                void startAuth('whatsapp');
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Iniciar sesión con número de teléfono
            </button>
          </div>
        ) : resolveQuery.isPending ? (
          <p className="text-sm text-slate-600">Cargando invitación...</p>
        ) : resolveQuery.error ? (
          <p className="text-sm text-rose-600">{resolveQuery.error.message}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">
                Invitación a tablero
              </p>
              <p className="text-sm text-slate-600">
                Tablero: {resolveQuery.data.boardName}
              </p>
              <p className="text-sm text-slate-600">
                Rol: {resolveQuery.data.targetRole}
              </p>
              <p className="text-sm text-slate-600">
                Estado: {resolveQuery.data.status}
              </p>
            </div>

            {resolveQuery.data.status === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void acceptMutation.mutateAsync({ token });
                  }}
                  disabled={acceptMutation.isPending}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {acceptMutation.isPending
                    ? 'Aceptando...'
                    : 'Aceptar invitación'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void declineMutation.mutateAsync({ token });
                  }}
                  disabled={declineMutation.isPending}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
                >
                  {declineMutation.isPending ? 'Rechazando...' : 'Rechazar'}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Esta invitación ya fue procesada.
              </p>
            )}

            {(acceptMutation.error || declineMutation.error || message) && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {acceptMutation.error?.message ||
                  declineMutation.error?.message ||
                  message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
