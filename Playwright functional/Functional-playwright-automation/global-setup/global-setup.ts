import { ConfigManager } from '../config/ConfigManager';
import { LogHelper } from '../logger/LogHelper';
import { getRunId, getRunLogFilePath } from '../logger/winstonLogger';

export default async function globalSetup(): Promise<void> {
  const config = ConfigManager.load();
  LogHelper.logSuiteStart(`Global setup — runId: ${getRunId()}, log: ${getRunLogFilePath()}`);
  LogHelper.logEnvironment();
  LogHelper.logStep('Global setup complete', {
    baseUrl: config.baseUrl,
    environment: config.testEnv,
  });
}
