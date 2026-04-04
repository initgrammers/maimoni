import { getApiBase } from '@/lib/openauth';

const API_BASE = getApiBase();

export async function removeIncome(
  accessToken: string,
  incomeId: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/incomes/${incomeId}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(result?.error ?? 'No se pudo eliminar el ingreso');
  }
}
