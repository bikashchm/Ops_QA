import { LogHelper } from '../logger/LogHelper';

export default async function globalTeardown(): Promise<void> {
  LogHelper.logSuiteEnd('Global teardown complete');
}
