import { LlamaParseReader } from '@llamaindex/cloud/reader';
import { Groq } from 'groq-sdk';
import { getEnv } from '../../utils/src/index';

export interface CategoryInput {
  name: string;
  type: 'expense' | 'income';
}

export interface ScanResult {
  total_amount: number;
  date: string;
  merchant_name: string;
  category: string;
  type: 'expense' | 'income';
  note: string;
  items: Array<{ name: string; price: number }>;
}

function buildPrompt(categories: CategoryInput[]): string {
  const expenseNames = categories
    .filter((c) => c.type === 'expense')
    .map((c) => `"${c.name}"`)
    .join(', ');
  const incomeNames = categories
    .filter((c) => c.type === 'income')
    .map((c) => `"${c.name}"`)
    .join(', ');

  return `Analyze the following receipt/invoice text and extract the information as JSON.

Fields:
- total_amount (number): The final total paid. Use the largest total if multiple exist.
- date (string): ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). If no time, use 12:00:00. If no date, use today.
- merchant_name (string): Store, restaurant, or business name.
- category (string): ONE of these:
  Expenses: ${expenseNames}
  Income: ${incomeNames}
- type (string): "expense" or "income". Most receipts are expenses.
- note (string): Brief description with merchant name and main items. Example: "McDonald's - 2 Big Macs, 1 McFlurry"
- items (array): Items with { name: string, price: number }. Empty array if unclear.

Return ONLY valid JSON.`;
}

function sanitizeResult(parsed: ScanResult): ScanResult {
  if (typeof parsed.total_amount !== 'number' || parsed.total_amount < 0) {
    parsed.total_amount = 0;
  }

  if (!parsed.type || (parsed.type !== 'expense' && parsed.type !== 'income')) {
    parsed.type = 'expense';
  }

  if (!parsed.category) {
    parsed.category = 'Otros';
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    parsed.items = [];
  }

  if (!parsed.note) {
    parsed.note = parsed.merchant_name || '';
  }

  return parsed;
}

export const extractReceiptInfo = async (
  fileBuffer: Buffer,
  fileName: string,
  categories: CategoryInput[],
): Promise<ScanResult> => {
  const { LLAMA_CLOUD_API_KEY: llamaKey, GROQ_API_KEY: groqKey } = getEnv([
    'LLAMA_CLOUD_API_KEY',
    'GROQ_API_KEY',
  ]);

  const llamaParse = new LlamaParseReader({
    apiKey: llamaKey,
    resultType: 'text',
    verbose: false,
  });

  const docs = await llamaParse.loadDataAsContent(fileBuffer, fileName);
  const receiptText = docs.map((d) => d.text).join('\n');

  if (!receiptText.trim()) {
    throw new Error('Could not extract text from the uploaded file.');
  }

  const groq = new Groq({ apiKey: groqKey });

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: `${buildPrompt(categories)}\n\nReceipt text:\n${receiptText}`,
      },
    ],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0].message.content;
  if (!raw) {
    throw new Error('Empty response from AI model.');
  }

  const parsed = JSON.parse(raw) as ScanResult;
  return sanitizeResult(parsed);
};
