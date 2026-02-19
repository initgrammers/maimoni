import {
  boolean,
  decimal,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const movementTypeEnum = pgEnum('movement_type', ['income', 'expense']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: text('phone_number').unique(),
  name: text('name'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),
  spendingLimitPercentage: decimal('spending_limit_percentage', {
    precision: 5,
    scale: 2,
  }),
  spendingLimitAmount: decimal('spending_limit_amount', {
    precision: 12,
    scale: 2,
  }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const boardMembers = pgTable(
  'board_members',
  {
    boardId: uuid('board_id')
      .references(() => boards.id)
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: [table.boardId, table.userId],
  }),
);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  emoji: text('emoji').notNull(),
  type: movementTypeEnum('type').notNull(),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const incomes = pgTable('incomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .references(() => boards.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  note: text('note'),
  date: timestamp('date').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .references(() => boards.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  note: text('note'),
  tags: text('tags').array(),
  receiptUrl: text('receipt_url'),
  date: timestamp('date').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .references(() => boards.id)
    .notNull(),
  invitedPhoneNumber: text('invited_phone_number'),
  invitedAnonymousId: uuid('invited_anonymous_id'),
  status: text('status').default('pending').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
