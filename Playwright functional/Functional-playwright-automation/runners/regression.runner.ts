import { createSuiteRunner } from './createSuiteRunner';
import { TAGS } from '../constants/tags';

/** Regression suite — full E2E, parallel, retry on failure in CI */
export default createSuiteRunner({
  suite: 'regression',
  tag: TAGS.REGRESSION,
  description: 'Full regression suite — all @regression tagged specs',
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 1,
});
