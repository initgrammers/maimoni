const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

export type MoneyAmount = string;

export function isMoneyAmount(value: string): value is MoneyAmount {
  return MONEY_REGEX.test(value);
}

export function ensureMoneyAmount(value: string): MoneyAmount {
  if (!isMoneyAmount(value)) {
    throw new Error('Invalid money amount');
  }

  return value;
}
