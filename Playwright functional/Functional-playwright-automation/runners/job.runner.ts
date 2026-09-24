import { createSuiteRunner } from './createSuiteRunner';
import { TAGS } from '../constants/tags';

/** Job module suite — treatment schedule, save/next, long workflows */
export default createSuiteRunner({
  suite: 'job',
  tag: TAGS.JOB,
  description: 'Job module — treatment schedule and save/next workflows',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 1,
});
