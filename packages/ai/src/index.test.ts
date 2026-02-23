import { describe, expect, mock, test } from 'bun:test';

// Inline type definitions to avoid static import from './index'
// This prevents the @maimoni/ai module mock from affecting these tests
type CategoryInput = {
  name: string;
  type: 'expense' | 'income';
};

type ScanResult = {
  total_amount: number;
  date: string;
  merchant_name: string;
  category: string;
  type: 'expense' | 'income';
  note: string;
  items: Array<{ name: string; price: number }>;
};

const TEST_CATEGORIES: CategoryInput[] = [
  { name: 'Alimentación', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Otros', type: 'expense' },
  { name: 'Sueldo', type: 'income' },
  { name: 'Transferencias', type: 'income' },
];

const VALID_SCAN_RESULT: ScanResult = {
  total_amount: 25.5,
  date: '2026-02-17T12:00:00.000Z',
  merchant_name: "McDonald's",
  category: 'Alimentación',
  type: 'expense',
  note: "McDonald's - 2 Big Macs",
  items: [
    { name: 'Big Mac', price: 10.25 },
    { name: 'Big Mac', price: 10.25 },
    { name: 'Coca Cola', price: 5.0 },
  ],
};

function setupMocks(options: {
  ocrText?: string;
  groqResponse?: string | null;
}) {
  const ocrText = options.ocrText ?? 'Receipt text from OCR';
  const groqResponse =
    options.groqResponse !== undefined
      ? options.groqResponse
      : JSON.stringify(VALID_SCAN_RESULT);

  mock.module('@llamaindex/cloud/reader', () => ({
    LlamaParseReader: class {
      loadDataAsContent = mock(() => Promise.resolve([{ text: ocrText }]));
    },
  }));

  mock.module('groq-sdk', () => ({
    Groq: class {
      chat = {
        completions: {
          create: mock(() =>
            Promise.resolve({
              choices: [{ message: { content: groqResponse } }],
            }),
          ),
        },
      };
    },
  }));

  delete require.cache[require.resolve('./index')];
}

describe('extractReceiptInfo', () => {
  test('throws when LLAMA_CLOUD_API_KEY is not set', async () => {
    const origLlama = process.env.LLAMA_CLOUD_API_KEY;
    const origGroq = process.env.GROQ_API_KEY;
    delete process.env.LLAMA_CLOUD_API_KEY;
    process.env.GROQ_API_KEY = 'test-groq-key';

    setupMocks({});
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceiptInfo(buffer, 'receipt.jpg', TEST_CATEGORIES),
    ).rejects.toThrow('LLAMA_CLOUD_API_KEY is required');

    if (origLlama) process.env.LLAMA_CLOUD_API_KEY = origLlama;
    if (origGroq) process.env.GROQ_API_KEY = origGroq;
    else delete process.env.GROQ_API_KEY;
  });

  test('throws when GROQ_API_KEY is not set', async () => {
    const origLlama = process.env.LLAMA_CLOUD_API_KEY;
    const origGroq = process.env.GROQ_API_KEY;
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    delete process.env.GROQ_API_KEY;

    setupMocks({});
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceiptInfo(buffer, 'receipt.jpg', TEST_CATEGORIES),
    ).rejects.toThrow('GROQ_API_KEY is required');

    if (origLlama) process.env.LLAMA_CLOUD_API_KEY = origLlama;
    else delete process.env.LLAMA_CLOUD_API_KEY;
    if (origGroq) process.env.GROQ_API_KEY = origGroq;
  });

  test('throws when OCR returns empty text', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    setupMocks({ ocrText: '   ' });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceiptInfo(buffer, 'receipt.jpg', TEST_CATEGORIES),
    ).rejects.toThrow('Could not extract text');
  });

  test('throws when Groq returns empty content', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    setupMocks({ groqResponse: null });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceiptInfo(buffer, 'receipt.jpg', TEST_CATEGORIES),
    ).rejects.toThrow('Empty response from AI model');
  });

  test('throws when Groq returns invalid JSON', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    setupMocks({ groqResponse: 'not valid json at all' });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    await expect(
      extractReceiptInfo(buffer, 'receipt.jpg', TEST_CATEGORIES),
    ).rejects.toThrow();
  });

  test('returns parsed scan result for valid response', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    setupMocks({});
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceiptInfo(
      buffer,
      'receipt.jpg',
      TEST_CATEGORIES,
    );

    expect(result.total_amount).toBe(25.5);
    expect(result.merchant_name).toBe("McDonald's");
    expect(result.category).toBe('Alimentación');
    expect(result.type).toBe('expense');
    expect(result.items).toHaveLength(3);
  });

  test('defaults type to expense when invalid', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const badResult = { ...VALID_SCAN_RESULT, type: 'invalid' };
    setupMocks({ groqResponse: JSON.stringify(badResult) });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceiptInfo(
      buffer,
      'receipt.png',
      TEST_CATEGORIES,
    );
    expect(result.type).toBe('expense');
  });

  test('defaults total_amount to 0 when negative', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const badResult = { ...VALID_SCAN_RESULT, total_amount: -5 };
    setupMocks({ groqResponse: JSON.stringify(badResult) });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceiptInfo(
      buffer,
      'receipt.jpg',
      TEST_CATEGORIES,
    );
    expect(result.total_amount).toBe(0);
  });

  test('defaults category to Otros when missing', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const badResult = { ...VALID_SCAN_RESULT, category: '' };
    setupMocks({ groqResponse: JSON.stringify(badResult) });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceiptInfo(
      buffer,
      'receipt.jpg',
      TEST_CATEGORIES,
    );
    expect(result.category).toBe('Otros');
  });

  test('defaults items to empty array when invalid', async () => {
    process.env.LLAMA_CLOUD_API_KEY = 'test-llama-key';
    process.env.GROQ_API_KEY = 'test-groq-key';

    const badResult = { ...VALID_SCAN_RESULT, items: 'not-an-array' };
    setupMocks({ groqResponse: JSON.stringify(badResult) });
    const { extractReceiptInfo } = await import('./index');

    const buffer = Buffer.from('fake-image-data');
    const result = await extractReceiptInfo(
      buffer,
      'receipt.jpg',
      TEST_CATEGORIES,
    );
    expect(result.items).toEqual([]);
  });
});
