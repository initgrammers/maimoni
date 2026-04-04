import { getApiBase } from '@/lib/openauth';
import type { BoardInvitation } from '../../components/types/dashboard';

const API_BASE = getApiBase();

export async function removeBoard(
  accessToken: string,
  boardId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/boards/${boardId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo eliminar el tablero');
  }
}

export async function fetchBoardInvitations(
  accessToken: string,
  boardId: string,
): Promise<BoardInvitation[]> {
  const response = await fetch(
    `${API_BASE}/api/boards/${boardId}/invitations`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudieron cargar las invitaciones');
  }

  return response.json() as Promise<BoardInvitation[]>;
}

export async function createBoardInvitation(
  accessToken: string,
  boardId: string,
  payload: {
    targetRole: 'editor' | 'viewer';
    ttlHours: number;
    phoneNumber?: string;
  },
): Promise<{ invitation: BoardInvitation; inviteToken: string }> {
  const response = await fetch(
    `${API_BASE}/api/boards/${boardId}/invitations`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo crear la invitación');
  }

  return response.json() as Promise<{
    invitation: BoardInvitation;
    inviteToken: string;
  }>;
}

export async function revokeInvitation(
  accessToken: string,
  invitationId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/invitations/${invitationId}/revoke`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo revocar la invitación');
  }
}
