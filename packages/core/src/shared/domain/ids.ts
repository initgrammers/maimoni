// Accept any UUID format (v1-v7, Nil UUID, etc.)
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntityId = string;

export function isUuid(value: string): value is EntityId {
  return UUID_REGEX.test(value);
}

export function ensureUuid(value: string, label = 'id'): EntityId {
  if (!isUuid(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return value;
}
