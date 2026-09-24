import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export type EnvironmentName = 'qa' | 'uat' | 'stage' | 'staging' | 'prod';

export interface DatabaseConfig {
  host: string;
  port: string;
  name: string;
  user: string;
  password: string;
}

export interface AppConfig {
  testEnv: EnvironmentName;
  baseUrl: string;
  authUrl: string;
  username: string;
  password: string;
  apiKey: string;
  secondaryUsername: string;
  secondaryPassword: string;
  db: DatabaseConfig;
}

const CREDENTIALS_DIR = path.resolve(process.cwd(), 'credentials');

const ENV_FILE_MAP: Record<EnvironmentName, string> = {
  qa: 'qa.env',
  uat: 'uat.env',
  stage: 'stage.env',
  staging: 'stage.env',
  prod: 'prod.env',
};

/**
 * Central configuration & credential manager.
 * Load order (lowest → highest priority):
 * 1. credentials/{env}.env
 * 2. credentials/.env.local (gitignored — local secrets)
 * 3. process.env (Azure DevOps pipeline variables / CI secrets)
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private loaded = false;
  private config: AppConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  static load(overrideEnv?: string): AppConfig {
    return ConfigManager.getInstance().load(overrideEnv);
  }

  static get(): AppConfig {
    return ConfigManager.getInstance().get();
  }

  static getEnvironmentName(): EnvironmentName {
    return ConfigManager.getInstance().resolveEnvironmentName();
  }

  static getBaseUrl(): string {
    return ConfigManager.getInstance().getBaseUrl();
  }

  static getAuthUrl(): string {
    return ConfigManager.getInstance().getAuthUrl();
  }

  static getCredentials(): { username: string; password: string } {
    return ConfigManager.getInstance().getCredentials();
  }

  static getSecondaryCredentials(): { username: string; password: string } {
    return ConfigManager.getInstance().getSecondaryCredentials();
  }

  static getApiKey(): string {
    return ConfigManager.getInstance().getApiKey();
  }

  static getDatabaseConfig(): DatabaseConfig {
    return ConfigManager.getInstance().getDatabaseConfig();
  }

  load(overrideEnv?: string): AppConfig {
    this.preloadLocalEnv();
    const envName = this.resolveEnvironmentName(overrideEnv);
    this.loadEnvFiles(envName);
    this.config = this.buildConfig(envName);
    this.loaded = true;
    return this.config;
  }

  get(): AppConfig {
    if (!this.loaded || !this.config) {
      return this.load();
    }
    return this.config;
  }

  getBaseUrl(): string {
    return this.get().baseUrl;
  }

  getAuthUrl(): string {
    return this.get().authUrl;
  }

  getCredentials(): { username: string; password: string } {
    const config = this.get();
    return {
      username: this.requireSecret('USERNAME', config.username),
      password: this.requireSecret('PASSWORD', config.password),
    };
  }

  getSecondaryCredentials(): { username: string; password: string } {
    const config = this.get();
    return {
      username: config.secondaryUsername,
      password: config.secondaryPassword,
    };
  }

  getApiKey(): string {
    return this.get().apiKey;
  }

  getDatabaseConfig(): DatabaseConfig {
    return this.get().db;
  }

  resolveEnvironmentName(override?: string): EnvironmentName {
    const raw = (override ?? process.env.TEST_ENV ?? 'uat').toLowerCase();
    if (raw === 'uat') return 'uat';
    if (raw === 'stage' || raw === 'staging') return 'stage';
    if (raw === 'prod' || raw === 'production') return 'prod';
    if (raw === 'qa') return 'qa';
    return 'uat';
  }

  /** Load .env.local first so TEST_ENV there can select qa/uat/stage/prod. */
  private preloadLocalEnv(): void {
    const localFile = path.join(CREDENTIALS_DIR, '.env.local');
    if (fs.existsSync(localFile)) {
      dotenv.config({ path: localFile });
    }
  }

  private loadEnvFiles(envName: EnvironmentName): void {
    const envFile = path.join(CREDENTIALS_DIR, ENV_FILE_MAP[envName]);
    const localFile = path.join(CREDENTIALS_DIR, '.env.local');

    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
    }

    if (fs.existsSync(localFile)) {
      dotenv.config({ path: localFile, override: true });
    }

    // process.env already has highest priority for keys set in CI/CD
  }

  private buildConfig(envName: EnvironmentName): AppConfig {
    return {
      testEnv: envName,
      baseUrl: this.read('BASE_URL'),
      authUrl: this.read('AUTH_URL', this.read('BASE_URL')),
      username: this.read('USERNAME'),
      password: this.read('PASSWORD'),
      apiKey: this.read('API_KEY'),
      secondaryUsername: this.read('SECONDARY_USERNAME'),
      secondaryPassword: this.read('SECONDARY_PASSWORD'),
      db: {
        host: this.read('DB_HOST'),
        port: this.read('DB_PORT', '5432'),
        name: this.read('DB_NAME'),
        user: this.read('DB_USER'),
        password: this.read('DB_PASSWORD'),
      },
    };
  }

  private read(key: string, fallback = ''): string {
    return (process.env[key] ?? fallback).trim();
  }

  private requireSecret(name: string, value: string): string {
    if (value) return value;
    throw new Error(
      `${name} is not configured. Set it in credentials/.env.local or as an Azure DevOps secret variable.`,
    );
  }
}

/** Convenience singleton accessors */
export const loadConfig = ConfigManager.load.bind(ConfigManager);
export const getConfig = ConfigManager.get.bind(ConfigManager);
export const getEnvironmentName = ConfigManager.getEnvironmentName.bind(ConfigManager);

// Eager load so logger and utilities have env on import
ConfigManager.load();
