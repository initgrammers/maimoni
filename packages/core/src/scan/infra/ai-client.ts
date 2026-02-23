import type { ScanAiClient } from '../application/ports';

export function createScanAiClient(): ScanAiClient {
  return {
    async extractReceiptInfo(input, fileName, categories) {
      const { extractReceiptInfo } = await import('@maimoni/ai');
      return extractReceiptInfo(input, fileName, categories);
    },
  };
}
