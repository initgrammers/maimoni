import type { ScanAiClient, ScanCategoryInput, ScanResult } from './ports';

export const MAX_SCAN_FILE_SIZE = 10 * 1024 * 1024;

export const ALLOWED_SCAN_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

export type ScanFileInput = {
  buffer: Buffer;
  name: string;
  size: number;
  type: string;
};

export type ScanReceiptInput = {
  actorId: string;
  file?: ScanFileInput | null;
  categories: ScanCategoryInput[];
};

export type ScanReceiptResult =
  | { status: 'scanned'; result: ScanResult }
  | { status: 'missing-file' }
  | { status: 'file-too-large'; maxSize: number }
  | { status: 'unsupported-file-type'; allowedTypes: string[] }
  | { status: 'failed'; error: string };

export function createScanReceipt(deps: { scanAiClient: ScanAiClient }) {
  const { scanAiClient } = deps;

  return async (input: ScanReceiptInput): Promise<ScanReceiptResult> => {
    if (!input.file) {
      return { status: 'missing-file' };
    }

    if (input.file.size > MAX_SCAN_FILE_SIZE) {
      return { status: 'file-too-large', maxSize: MAX_SCAN_FILE_SIZE };
    }

    if (!ALLOWED_SCAN_FILE_TYPES.includes(input.file.type)) {
      return {
        status: 'unsupported-file-type',
        allowedTypes: ALLOWED_SCAN_FILE_TYPES,
      };
    }

    try {
      const result = await scanAiClient.extractReceiptInfo(
        input.file.buffer,
        input.file.name,
        input.categories,
      );

      return { status: 'scanned', result };
    } catch (error) {
      return {
        status: 'failed',
        error:
          error instanceof Error ? error.message : 'Failed to process receipt',
      };
    }
  };
}
