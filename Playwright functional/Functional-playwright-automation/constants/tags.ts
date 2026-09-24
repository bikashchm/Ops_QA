/** Playwright grep tags — TestNG @Groups equivalent */
export const TAGS = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  SANITY: '@sanity',
  ADMIN: '@admin',
  JOB: '@job',
  SAMPLE: '@sample',
} as const;

export type SuiteTag = (typeof TAGS)[keyof typeof TAGS];

export type SuiteName = 'smoke' | 'regression' | 'sanity' | 'admin' | 'job';

export interface SuiteDefinition {
  name: SuiteName;
  tag: SuiteTag;
  runner: string;
  description: string;
}

/** Central registry — single source of truth for suite → runner mapping */
export const SUITE_REGISTRY: Record<SuiteName, SuiteDefinition> = {
  smoke: {
    name: 'smoke',
    tag: TAGS.SMOKE,
    runner: 'runners/smoke.runner.ts',
    description: 'Critical path — fast validation after deploy',
  },
  regression: {
    name: 'regression',
    tag: TAGS.REGRESSION,
    runner: 'runners/regression.runner.ts',
    description: 'Full regression — all tagged end-to-end flows',
  },
  sanity: {
    name: 'sanity',
    tag: TAGS.SANITY,
    runner: 'runners/sanity.runner.ts',
    description: 'Post-build sanity checks — key module validations',
  },
  admin: {
    name: 'admin',
    tag: TAGS.ADMIN,
    runner: 'runners/admin.runner.ts',
    description: 'Admin module — pad/well setup and configuration',
  },
  job: {
    name: 'job',
    tag: TAGS.JOB,
    runner: 'runners/job.runner.ts',
    description: 'Job module — treatment schedule and save/next workflows',
  },
};
