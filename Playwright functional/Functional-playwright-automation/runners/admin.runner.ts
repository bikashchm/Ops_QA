import { createSuiteRunner } from './createSuiteRunner';
import { TAGS } from '../constants/tags';

/** Admin module suite — pad/well creation and admin flows */
export default createSuiteRunner({
  suite: 'admin',
  tag: TAGS.ADMIN,
  description: 'Admin module — pad/well setup and configuration',
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
});
