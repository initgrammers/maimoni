import { createOpenAI } from '@ai-sdk/openai';
import { LlamaParseReader } from '@llamaindex/cloud/reader';
import { generateText } from 'ai';
import { Groq } from 'groq-sdk';
import { getEnv } from '../../utils/src/index';

export interface CategoryInput {
  name: string;
  type: 'expense' | 'income';
  subcategories?: string[];
}

export interface ScanResult {
  total_amount: number;
  date: string;
  merchant_name: string;
  category: string;
  subcategory?: string;
  type: 'expense' | 'income';
  note: string;
  items: Array<{ name: string; price: number }>;
}

function buildCategoriesStructure(categories: CategoryInput[]): string {
  const lines: string[] = [];

  const expenses = categories.filter((c) => c.type === 'expense');
  const incomes = categories.filter((c) => c.type === 'income');

  for (const cat of expenses) {
    lines.push(`  - ${cat.name}`);
    if (cat.subcategories && cat.subcategories.length > 0) {
      for (const sub of cat.subcategories) {
        lines.push(`    - ${sub}`);
      }
    }
  }

  lines.push('  Income:');
  for (const cat of incomes) {
    lines.push(`  - ${cat.name}`);
    if (cat.subcategories && cat.subcategories.length > 0) {
      for (const sub of cat.subcategories) {
        lines.push(`    - ${sub}`);
      }
    }
  }

  return lines.join('\n');
}

function buildPrompt(categories: CategoryInput[]): string {
  const categoriesStructure = buildCategoriesStructure(categories);

  // Prompt for text-based extraction (LlamaParse + Groq)
  return `Analyze the following receipt/invoice text and extract the information as JSON.

IMPORTANT: 
- You MUST return EXACT category and subcategory names from the lists below
- Do NOT invent new names
- If no subcategory matches, set subcategory to null

Fields:
- total_amount (number): The final total paid. Use the largest total if multiple exist.
- date (string): ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). If no time, use 12:00:00. If no date, use today.
- merchant_name (string): Store, restaurant, or business name.
- category (string): Main category - MUST be EXACTLY one of these:
${categoriesStructure}
  If none match, use "Otros" for expenses or "Ingresos" for income.
- subcategory (string | null): More specific category from the subcategories above. Set to null if no subcategory matches.
- type (string): "expense" or "income". Most receipts are expenses.
- note (string): Brief description with merchant name and main items. Example: "McDonald's - 2 Big Macs, 1 McFlurry"
- items (array): Items with { name: string, price: number }. Empty array if unclear.

Return ONLY valid JSON.`;
}

function buildVisionPrompt(categories: CategoryInput[]): string {
  const categoriesStructure = buildCategoriesStructure(categories);

  // Prompt for vision-based extraction (single model with vision)
  return `You are an expert at extracting information from receipts and invoices. Analyze the provided receipt image and extract the information as JSON.

IMPORTANT: 
- You MUST return EXACT category and subcategory names from the lists below
- Do NOT invent new names
- If no subcategory matches, set subcategory to null

Fields to extract:
- total_amount (number): The final total paid. Use the largest total if multiple exist.
- date (string): ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). If no time, use 12:00:00. If no date, use today's date.
- merchant_name (string): Store, restaurant, or business name.
- category (string): Main category - MUST be EXACTLY one of these:
${categoriesStructure}
  If none match, use "Otros" for expenses or "Ingresos" for income.
- subcategory (string | null): More specific category from the subcategories above. Set to null if no subcategory matches.
- type (string): "expense" or "income". Most receipts are expenses.
- note (string): Brief description with merchant name and main items. Example: "McDonald's - 2 Big Macs, 1 McFlurry"
- items (array): Items with { name: string, price: number }. Empty array if unclear.

IMPORTANT: Return ONLY valid JSON, no additional text or explanation.`;
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
  const useSingleModel = process.env.USE_SINGLE_MODEL_SCAN === 'true';

  if (useSingleModel) {
    return extractWithVisionModel(fileBuffer, fileName, categories);
  }

  return extractWithOcrPipeline(fileBuffer, fileName, categories);
};

// New approach: Single model with vision (Claude 3 Haiku)
async function extractWithVisionModel(
  fileBuffer: Buffer,
  fileName: string,
  categories: CategoryInput[],
): Promise<ScanResult> {
  const { OPEN_ROUTER_API_KEY: openRouterKey } = getEnv([
    'OPEN_ROUTER_API_KEY',
  ]);

  const openai = createOpenAI({
    apiKey: openRouterKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const base64Image = fileBuffer.toString('base64');
  const mimeType = getMimeType(fileName);

  const result = await generateText({
    model: openai('anthropic/claude-3-haiku'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: `data:${mimeType};base64,${base64Image}`,
          },
          {
            type: 'text',
            text: buildVisionPrompt(categories),
          },
        ],
      },
    ],
  });

  const raw = result.text;
  if (!raw) {
    throw new Error('Empty response from AI model.');
  }

  const parsed = JSON.parse(raw) as ScanResult;
  return sanitizeResult(parsed);
}

// Original approach: LlamaParse (OCR) + Groq (LLM)
async function extractWithOcrPipeline(
  fileBuffer: Buffer,
  fileName: string,
  categories: CategoryInput[],
): Promise<ScanResult> {
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
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    pdf: 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'image/jpeg';
}
