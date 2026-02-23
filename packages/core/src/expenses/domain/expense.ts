import { isIsoDateTime } from '../../shared/domain/date';
import { isMoneyAmount } from '../../shared/domain/money';

export function isExpenseAmount(value: string) {
  return isMoneyAmount(value);
}

export function isExpenseDate(value: string) {
  return isIsoDateTime(value);
}
