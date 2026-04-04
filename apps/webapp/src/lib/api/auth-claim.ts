import { getApiBase } from '@/lib/openauth';

const API_BASE = getApiBase();

export async function claimAnonymousBoard(
  accessToken: string,
  anonymousId: string,
  localExpenses: unknown[] = [],
  localIncomes: unknown[] = [],
  localBoardId?: string,
  localBoardName?: string,
  localSpendingLimit?: string | null,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      anonymousId,
      expenses: localExpenses,
      incomes: localIncomes,
      boardId: localBoardId,
      boardName: localBoardName,
      spendingLimitAmount: localSpendingLimit,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo reclamar el tablero');
  }
}
