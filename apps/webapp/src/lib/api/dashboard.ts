import { getApiBase } from '@/lib/openauth';
import type { DashboardResponse } from '../../components/types/dashboard';

const API_BASE = getApiBase();

export const dashboardQueryKey = (accessToken: string) =>
  ['dashboard', accessToken] as const;

export async function fetchDashboard(
  accessToken: string,
  boardId?: string | null,
): Promise<DashboardResponse> {
  const url = new URL(`${API_BASE}/api/dashboard`);
  if (boardId) {
    url.searchParams.set('boardId', boardId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudo cargar el tablero');
  }

  return response.json() as Promise<DashboardResponse>;
}
