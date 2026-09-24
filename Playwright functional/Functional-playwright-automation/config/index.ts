export {
  ConfigManager,
  loadConfig,
  getConfig,
  getEnvironmentName,
  getEnvironmentConfig,
} from './environment';
export type { AppConfig, DatabaseConfig, EnvironmentName, EnvironmentConfig } from './environment';
export {
  PROJECT_ROOT,
  REPORTS_DIR,
  isHeadless,
  resolveWorkers,
  resolveRetries,
  buildReporters,
  buildProjects,
} from './playwright.settings';
