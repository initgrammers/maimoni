import { spawnSync } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';
import { claimAnonymousData } from './core';
import { boards, categories, expenses, incomes, users } from './schema';

async function run() {
  const dockerReady =
    spawnSync('docker', ['info'], {
      stdio: 'ignore',
    }).status === 0;

  if (!dockerReady) {
    throw new Error('Docker is not available');
  }

  const container = await new GenericContainer('postgres:16')
    .withEnvironment({
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(180_000)
    .start();

  const client = new Client({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: 'test',
    user: 'test',
    password: 'test',
  });

  try {
    await client.connect();

    await client.query(
      "CREATE TYPE movement_type AS ENUM ('income', 'expense')",
    );
    await client.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        phone_number text UNIQUE,
        name text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE boards (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        owner_id uuid NOT NULL REFERENCES users(id),
        spending_limit_percentage decimal(5,2),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE board_members (
        board_id uuid NOT NULL REFERENCES boards(id),
        user_id uuid NOT NULL REFERENCES users(id),
        is_active boolean NOT NULL DEFAULT true,
        joined_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY(board_id, user_id)
      )
    `);
    await client.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        emoji text NOT NULL,
        type movement_type NOT NULL,
        parent_id uuid,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE incomes (
        id uuid PRIMARY KEY,
        board_id uuid NOT NULL REFERENCES boards(id),
        user_id uuid NOT NULL REFERENCES users(id),
        amount decimal(12,2) NOT NULL,
        category_id uuid NOT NULL REFERENCES categories(id),
        note text,
        date timestamp NOT NULL DEFAULT now(),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE expenses (
        id uuid PRIMARY KEY,
        board_id uuid NOT NULL REFERENCES boards(id),
        user_id uuid NOT NULL REFERENCES users(id),
        amount decimal(12,2) NOT NULL,
        category_id uuid NOT NULL REFERENCES categories(id),
        note text,
        tags text[],
        receipt_url text,
        date timestamp NOT NULL DEFAULT now(),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE invitations (
        id uuid PRIMARY KEY,
        board_id uuid NOT NULL REFERENCES boards(id),
        invited_phone_number text,
        invited_anonymous_id uuid,
        status text NOT NULL DEFAULT 'pending',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);

    const db = drizzle(client);

    const anonymousId = '11111111-1111-1111-1111-111111111111';
    const realUserId = '22222222-2222-2222-2222-222222222222';
    const boardId = '33333333-3333-3333-3333-333333333333';
    const categoryIncomeId = '44444444-4444-4444-4444-444444444444';
    const categoryExpenseId = '55555555-5555-5555-5555-555555555555';

    await db.insert(users).values([
      { id: anonymousId, phoneNumber: null },
      { id: realUserId, phoneNumber: '+593999999999' },
    ]);

    await db
      .insert(boards)
      .values({ id: boardId, name: 'Anon', ownerId: anonymousId });

    await db.insert(categories).values([
      { id: categoryIncomeId, name: 'Salary', emoji: 'money', type: 'income' },
      { id: categoryExpenseId, name: 'Food', emoji: 'food', type: 'expense' },
    ]);

    await db.insert(incomes).values({
      id: '88888888-8888-8888-8888-888888888888',
      boardId,
      userId: anonymousId,
      amount: '100.00',
      categoryId: categoryIncomeId,
    });

    await db.insert(expenses).values({
      id: '99999999-9999-9999-9999-999999999999',
      boardId,
      userId: anonymousId,
      amount: '10.00',
      categoryId: categoryExpenseId,
    });

    await claimAnonymousData(db as never, { realUserId, anonymousId });

    const boardRows = await db
      .select()
      .from(boards)
      .where(eq(boards.id, boardId));
    const incomeRows = await db
      .select()
      .from(incomes)
      .where(eq(incomes.boardId, boardId));
    const expenseRows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.boardId, boardId));
    const oldUserRows = await db
      .select()
      .from(users)
      .where(eq(users.id, anonymousId));

    if (boardRows[0]?.ownerId !== realUserId) {
      throw new Error('Board ownership was not transferred');
    }
    if (incomeRows[0]?.userId !== realUserId) {
      throw new Error('Income ownership was not transferred');
    }
    if (expenseRows[0]?.userId !== realUserId) {
      throw new Error('Expense ownership was not transferred');
    }
    if (oldUserRows.length !== 0) {
      throw new Error('Anonymous user was not deleted');
    }

    console.log('Integration test passed');
  } finally {
    await client.end().catch(() => undefined);
    await container.stop().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
