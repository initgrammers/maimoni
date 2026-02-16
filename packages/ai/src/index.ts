import { LlamaParseReader } from '@llamaindex/cloud/reader';
import { Groq } from 'groq-sdk';

export const extractReceiptInfo = async (
  fileBuffer: Buffer,
  fileName: string,
) => {
  const llamaParse = new LlamaParseReader({
    apiKey: process.env.LLAMA_CLOUD_API_KEY,
    resultType: 'text',
    verbose: false,
  });

  const docs = await llamaParse.loadDataAsContent(fileBuffer, fileName);
  const receiptText = docs.map((d) => d.text).join('\n');

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `
    Extract the following information from the receipt text in JSON format:
    - total_amount (number)
    - date (ISO 8601 string, if not present use current)
    - merchant_name (string)
    - category (one of: Food, Transport, Housing, Health, Entertainment, Shopping, Education, Travel, Financial, Other)
    - items (array of { name: string, price: number })

    Receipt text:
    ${receiptText}

    Return ONLY the JSON.
  `;

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    response_format: { type: 'json_object' },
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
};
