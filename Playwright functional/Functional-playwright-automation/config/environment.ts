import { ConfigManager, type AppConfig, type DatabaseConfig, type EnvironmentName } from './ConfigManager';

export type { AppConfig, DatabaseConfig, EnvironmentName };

export interface EnvironmentConfig {
  name: EnvironmentName;
  baseUrl: string;
  authUrl: string;
}

/** @deprecated Use ConfigManager.get() — kept for backward compatibility */
export function getEnvironmentName(): EnvironmentName {
  return ConfigManager.getEnvironmentName();
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const config = ConfigManager.get();
  return {
    name: config.testEnv,
    baseUrl: config.baseUrl,
    authUrl: config.authUrl,
  };
}

export { ConfigManager, loadConfig, getConfig } from './ConfigManager';
