/**
 * Logger Utility - conditional logging based on environment
 */

const isDev = (import.meta as any).env?.DEV ?? true;

export const logger = {
  debug(...args: any[]): void {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  error(...args: any[]): void {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  }
};
