import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { ConfigManager } from '../config/ConfigManager';
import { LOGS_DIR } from '../constants/paths';

export type LogCategory =
  | 'TEST'
  | 'STEP'
  | 'API'
  | 'RETRY'
  | 'SCREENSHOT'
  | 'FRAMEWORK'
  | 'ENV';

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const ENV_NAME = ConfigManager.getEnvironmentName();

function ensureLogDirectories(): void {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.mkdirSync(path.join(LOGS_DIR, 'runs'), { recursive: true });
  fs.mkdirSync(path.join(LOGS_DIR, 'api'), { recursive: true });
}

ensureLogDirectories();

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, category, testName, ...meta }) => {
    const categoryTag = category ? `[${category}]` : '';
    const testTag = testName ? `[${testName}]` : '';
    const envTag = `[env:${ENV_NAME}]`;
    const metaKeys = Object.keys(meta).filter(
      (k) => !['level', 'timestamp', 'environment', 'runId', 'ci', 'service'].includes(k),
    );
    const metaText = metaKeys.length
      ? ` ${JSON.stringify(Object.fromEntries(metaKeys.map((k) => [k, meta[k]])))}`
      : '';
    return `${timestamp} ${envTag} [${String(level).toUpperCase()}]${categoryTag}${testTag} ${message}${metaText}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const runLogFile = path.join(LOGS_DIR, 'runs', `test-run-${RUN_ID}.log`);

/** Enterprise Winston logger — console + file + error + API channels. */
export const appLogger = winston.createLogger({
  level: (process.env.LOG_LEVEL ?? 'info').toLowerCase(),
  defaultMeta: {
    environment: ENV_NAME,
    runId: RUN_ID,
    ci: !!process.env.CI,
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'automation.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'errors.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      format: logFormat,
    }),
    new winston.transports.File({
      filename: runLogFile,
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'api', 'api.log'),
      level: 'info',
      format: jsonFormat,
    }),
  ],
});

/** Backward-compatible facade for existing framework utilities. */
export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    appLogger.debug(message, { category: 'FRAMEWORK', ...meta });
  },
  info(message: string, meta?: Record<string, unknown>): void {
    appLogger.info(message, { category: 'FRAMEWORK', ...meta });
  },
  warn(message: string, meta?: Record<string, unknown>): void {
    appLogger.warn(message, { category: 'FRAMEWORK', ...meta });
  },
  error(message: string, meta?: Record<string, unknown>): void {
    appLogger.error(message, { category: 'FRAMEWORK', ...meta });
  },
};

export function getRunLogFilePath(): string {
  return runLogFile;
}

export function getRunId(): string {
  return RUN_ID;
}
