import type { Context } from 'hono';
import type { UserContext } from './auth';

/**
 * Business context for wide-event logging
 */
export interface BusinessContext {
  endpoint: string;
  entityType?:
    | 'board'
    | 'expense'
    | 'income'
    | 'category'
    | 'invitation'
    | 'scan';
  action?: 'create' | 'update' | 'delete' | 'list' | 'get' | 'scan' | 'claim';
  boardId?: string;
  entityId?: string;
}

/**
 * Add business context to wide-logger for observability
 */
export function addBusinessContext(
  c: Context<UserContext>,
  context: BusinessContext,
): void {
  const logger = c.get('wide-logger');
  if (logger) {
    logger.addContext('business', context);
  }
}
