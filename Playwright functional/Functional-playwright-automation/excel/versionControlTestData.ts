import type { KeyValueOptions } from './types';

export type VersionControlChangeHistoryEntry = {
  screenName: string;
  stage?: string;
};

export type VersionControlTestConfig = {
  padName: string;
  wellName: string;
  /** Well with a version owned by someone other than the logged-in user (sub-menubar switch). */
  otherUserWellName: string;
  /** Well used when the landing well has no pickable version owned by the logged-in user. */
  sameUserWellName: string;
  companyButtonName: string;
  baseVersionName: string;
  automationVersionName: string;
  baseVersionOwner: string;
  baseVersionOwnerEmail: string;
  automationVersionOwner: string;
  automationVersionOwnerEmail: string;
  changeHistoryEntries: readonly VersionControlChangeHistoryEntry[];
};

/** Written to Excel only when missing (codegen Base Version owner). */
export const VERSION_CONTROL_EXCEL_DEFAULTS: Record<string, string> = {
  VersionControlBaseVersionName: 'Base Version',
  VersionControlAutomationVersionName: 'Base Version',
  VersionControlBaseOwner: 'Bikash Moharana',
  VersionControlBaseOwnerEmail: 'bikash.moharana@walkingtree.tech',
  VersionControlAutomationOwner: 'Bikash Moharana',
  VersionControlAutomationOwnerEmail: 'bikash.moharana@walkingtree.tech',
};

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Write VersionControl owner/name keys only when missing/empty. */
export function ensureVersionControlExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(VERSION_CONTROL_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

function parseChangeHistory(raw: string): VersionControlChangeHistoryEntry[] {
  return raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [screenName, stage] = part.split('|').map((value) => value.trim());
      return {
        screenName,
        ...(stage ? { stage } : {}),
      };
    })
    .filter((entry) => Boolean(entry.screenName));
}

/**
 * Version Control keys. Pad/well search always uses shared Excel Padname / WellName
 * (same as WellAndTreatment / createwellandpad).
 *
 * VersionControlOtherUserWellName / VersionControlSameUserWellName — optional well
 * switches after open; empty means stay on Excel WellName.
 * VersionControlBaseVersionName, VersionControlAutomationVersionName
 * VersionControlBaseOwner, VersionControlBaseOwnerEmail
 * VersionControlAutomationOwner, VersionControlAutomationOwnerEmail
 * VersionControlChangeHistory  — `Screen Name|Stage;Screen Name` (stage optional)
 */
export function buildVersionControlTestConfig(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): VersionControlTestConfig {
  // Always navigate with shared Excel Padname / WellName (same as WellAndTreatment).
  const padName = sharedPadWell.padName;
  const wellName = sharedPadWell.wellName;
  const d = VERSION_CONTROL_EXCEL_DEFAULTS;

  return {
    padName,
    wellName,
    otherUserWellName:
      get('VersionControlOtherUserWellName', { fallback: wellName }).trim() || wellName,
    sameUserWellName:
      get('VersionControlSameUserWellName', { fallback: wellName }).trim() || wellName,
    companyButtonName:
      get('CompanyButtonName', { fallback: sharedPadWell.companyButtonName }).trim() ||
      sharedPadWell.companyButtonName,
    baseVersionName:
      get('VersionControlBaseVersionName', { fallback: d.VersionControlBaseVersionName }).trim() ||
      d.VersionControlBaseVersionName,
    automationVersionName:
      get('VersionControlAutomationVersionName', {
        fallback: d.VersionControlAutomationVersionName,
      }).trim() || d.VersionControlAutomationVersionName,
    baseVersionOwner:
      get('VersionControlBaseOwner', { fallback: d.VersionControlBaseOwner }).trim() ||
      d.VersionControlBaseOwner,
    baseVersionOwnerEmail:
      get('VersionControlBaseOwnerEmail', { fallback: d.VersionControlBaseOwnerEmail }).trim() ||
      d.VersionControlBaseOwnerEmail,
    automationVersionOwner:
      get('VersionControlAutomationOwner', { fallback: d.VersionControlAutomationOwner }).trim() ||
      d.VersionControlAutomationOwner,
    automationVersionOwnerEmail:
      get('VersionControlAutomationOwnerEmail', {
        fallback: d.VersionControlAutomationOwnerEmail,
      }).trim() || d.VersionControlAutomationOwnerEmail,
    changeHistoryEntries: parseChangeHistory(get('VersionControlChangeHistory', { fallback: '' })),
  };
}

export type VersionControlMasterOnlyPadWell = {
  padName: string;
  wellName: string;
  companyButtonName: string;
};

/**
 * Well that has only the master / Base Version (no extra versions created).
 * Always uses shared Excel Padname / WellName (same as WellAndTreatment).
 */
export function buildVersionControlMasterOnlyPadWell(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): VersionControlMasterOnlyPadWell {
  const padName = sharedPadWell.padName;
  const wellName = sharedPadWell.wellName;

  return {
    padName,
    wellName,
    companyButtonName:
      get('CompanyButtonName', { fallback: sharedPadWell.companyButtonName }).trim() ||
      sharedPadWell.companyButtonName,
  };
}
