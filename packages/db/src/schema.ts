import {
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
  phoneNumber: text('phone_number').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
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
});

export const movements = pgTable('movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .references(() => boards.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  type: movementTypeEnum('type').notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id)
    .notNull(),
  note: text('note'),
  tags: text('tags').array(),
  receiptUrl: text('receipt_url'),
  date: timestamp('date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .references(() => boards.id)
    .notNull(),
  invitedPhoneNumber: text('invited_phone_number').notNull(),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
