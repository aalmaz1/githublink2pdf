/**
 * Logger Utility - conditional logging based on environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = (import.meta as any).env?.DEV ?? true;

export const logger = {
  debug(...args: any[]): void {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  info(...args: any[]): void {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },

  warn(...args: any[]): void {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  error(...args: any[]): void {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  }
};
