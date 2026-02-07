const isDev = process.env.NODE_ENV !== 'production';

export function debugLog(label: string, ...args: unknown[]): void {
  if (isDev) console.log(`[${label}]`, ...args);
}
