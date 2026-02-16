export function getEnv(key: string): string;
export function getEnv(keys: string[]): Record<string, string>;
export function getEnv(
  input: string | string[],
): string | Record<string, string> {
  if (typeof input === 'string') {
    const value = process.env[input];
    if (!value) {
      throw new Error(
        `Environment variable ${input} is required but not defined.`,
      );
    }
    return value;
  }

  const result: Record<string, string> = {};
  for (const key of input) {
    const value = process.env[key];
    if (!value) {
      throw new Error(
        `Environment variable ${key} is required but not defined.`,
      );
    }
    result[key] = value;
  }
  return result;
}
