import { createSuiteRunner } from './createSuiteRunner';
import { TAGS } from '../constants/tags';

/** Smoke suite — critical path, parallel, minimal retries */
export default createSuiteRunner({
  suite: 'smoke',
  tag: TAGS.SMOKE,
  description: 'Critical path smoke tests — fast post-deploy validation',
  workers: 2,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
});
