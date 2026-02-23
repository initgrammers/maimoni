export type IsoDateTime = string;

export function isIsoDateTime(value: string): value is IsoDateTime {
  return !Number.isNaN(Date.parse(value));
}

export function ensureIsoDateTime(value: string, label = 'date'): IsoDateTime {
  if (!isIsoDateTime(value)) {
    throw new Error(`Invalid ${label}`);
  }

  return value;
}
