import { createSuiteRunner } from './createSuiteRunner';
import { TAGS } from '../constants/tags';

/** Sanity suite — key validations, can run sequential for stability */
export default createSuiteRunner({
  suite: 'sanity',
  tag: TAGS.SANITY,
  description: 'Sanity checks — post-build module validation',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
});
