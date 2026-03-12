import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const STORAGE_FILE = 'wide-events.json';

/**
 * JSON file-based storage for wide-logger events
 * Stores events in a JSON file for later analysis
 */
export function createJsonStorage() {
  const storagePath = join(process.cwd(), STORAGE_FILE);

  async function readData(): Promise<Record<string, unknown>> {
    try {
      const content = await fs.readFile(storagePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async function writeData(data: Record<string, unknown>): Promise<void> {
    try {
      await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing wide-events.json:', error);
    }
  }

  return {
    async set(key: string, value: unknown) {
      console.log('[wide-storage] Saving event:', key);
      const data = await readData();
      data[key] = value;
      await writeData(data);
    },

    async get(key: string) {
      const data = await readData();
      return data[key];
    },

    async delete(key: string) {
      console.log('[wide-storage] Deleting event:', key);
      const data = await readData();
      delete data[key];
      await writeData(data);
    },
  };
}
