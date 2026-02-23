import { isIsoDateTime } from '../../shared/domain/date';
import { isMoneyAmount } from '../../shared/domain/money';

export function isIncomeAmount(value: string) {
  return isMoneyAmount(value);
}

export function isIncomeDate(value: string) {
  return isIsoDateTime(value);
}
