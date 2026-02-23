import { createHash, randomBytes } from 'node:crypto';
import { invitations } from '@maimoni/db';

type DbClient = ReturnType<typeof import('@maimoni/db').createClient>;

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isMissingColumnError(error: unknown) {
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const candidate = current as {
      code?: string;
      message?: string;
      stack?: string;
      cause?: unknown;
    };

    const combinedText =
      `${candidate.message ?? ''}\n${candidate.stack ?? ''}\n${String(candidate)}`.toLowerCase();

    if (
      candidate.code === '42703' ||
      combinedText.includes('42703') ||
      combinedText.includes('does not exist')
    ) {
      return true;
    }

    if ('cause' in candidate) {
      queue.push(candidate.cause);
    }

    for (const key of Object.getOwnPropertyNames(candidate)) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (!descriptor || !('value' in descriptor)) {
        continue;
      }

      const value = descriptor.value;
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return false;
}

export function buildInvitationToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInviteToken(token) };
}

export function parseInvitationToken(token: string) {
  return hashInviteToken(token);
}

export async function ensureInvitationsSchemaIsReady(db: DbClient) {
  try {
    await db
      .select({
        id: invitations.id,
        invitedByUserId: invitations.invitedByUserId,
        inviteTokenHash: invitations.inviteTokenHash,
      })
      .from(invitations)
      .limit(1);

    return null;
  } catch (error) {
    if (isMissingColumnError(error)) {
      return 'Invitaciones no disponibles: falta aplicar la migración 0004_invitation_membership_upgrade.sql';
    }

    const errorText =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ''}`.toLowerCase()
        : '';
    if (
      errorText.includes('failed query') &&
      errorText.includes('invitations')
    ) {
      return 'Invitaciones temporalmente no disponibles en este entorno';
    }

    return 'Invitaciones temporalmente no disponibles en este entorno';
  }
}
