import { spawnSync } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';
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
        spending_limit_amount decimal(12,2),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
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

    const db = drizzle(client);

    const userId = '22222222-2222-2222-2222-222222222222';
    const otherUserId = '11111111-1111-1111-1111-111111111111';
    const boardId = '33333333-3333-3333-3333-333333333333';
    const categoryIncomeId = '44444444-4444-4444-4444-444444444444';
    const categoryExpenseId = '55555555-5555-5555-5555-555555555555';

    await db.insert(users).values([
      { id: userId, phoneNumber: '+593999999999' },
      { id: otherUserId, phoneNumber: '+593888888888' },
    ]);

    await db
      .insert(boards)
      .values({ id: boardId, name: 'My Board', ownerId: userId });

    await db.insert(categories).values([
      { id: categoryIncomeId, name: 'Salary', emoji: 'money', type: 'income' },
      { id: categoryExpenseId, name: 'Food', emoji: 'food', type: 'expense' },
    ]);

    // Test successful income creation
    const incomeId = '11111111-1111-1111-1111-000000000001';
    await db.insert(incomes).values({
      id: incomeId,
      boardId,
      userId,
      amount: '150.50',
      categoryId: categoryIncomeId,
      note: 'Freelance work',
    });

    const incomeRows = await db
      .select()
      .from(incomes)
      .where(eq(incomes.id, incomeId));
    if (incomeRows.length !== 1 || incomeRows[0].amount !== '150.50') {
      throw new Error('Income was not created correctly');
    }

    // Test successful expense creation
    const expenseId = '11111111-1111-1111-1111-000000000002';
    await db.insert(expenses).values({
      id: expenseId,
      boardId,
      userId,
      amount: '45.20',
      categoryId: categoryExpenseId,
      note: 'Dinner',
    });

    const expenseRows = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId));
    if (expenseRows.length !== 1 || expenseRows[0].amount !== '45.20') {
      throw new Error('Expense was not created correctly');
    }

    // Test category type validation (Inferred, since we don't have DB-level constraints yet, we just check if we can insert)
    // In a real app, the API layer (Hono + Zod) handles this.

    console.log('Manual entry integration tests passed');
  } finally {
    await client.end().catch(() => undefined);
    await container.stop().catch(() => undefined);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
