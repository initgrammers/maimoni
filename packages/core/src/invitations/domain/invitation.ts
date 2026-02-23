import { createHash, randomBytes } from 'node:crypto';

export type InvitationRole = 'editor' | 'viewer';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'revoked'
  | 'expired';

type InvitationToken = {
  token: string;
  tokenHash: string;
};

function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function buildInvitationToken(): InvitationToken {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInviteToken(token) };
}

export function parseInvitationToken(token: string) {
  return hashInviteToken(token);
}

export function isInvitationExpired(input: {
  status: InvitationStatus;
  expiresAt: Date | null;
}) {
  if (input.status !== 'pending') {
    return false;
  }

  if (!input.expiresAt) {
    return false;
  }

  return input.expiresAt <= new Date();
}
