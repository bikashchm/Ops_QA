/**
 * Brief, readable step titles for pipeline / HTML reports.
 * Converts field keys (padName) into plain language (pad name).
 */

/** camelCase / snake_case field keys → readable phrase */
export function humanizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'field';

  // Already a UI phrase (New Pad, Sign in, Location tab)
  if (trimmed.includes(' ') || /^Click |^Enter |^Verify |^Select |^Open /.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase();
}

export function clickStep(label: string): string {
  const trimmed = label.trim();
  // UI labels: Continue, New Pad, Stimulation tab, pad "xyz"
  if (
    trimmed.includes(' ') ||
    trimmed.includes('"') ||
    (/^[A-Z]/.test(trimmed) && !/[a-z][A-Z]/.test(trimmed))
  ) {
    return `Click ${trimmed}`;
  }
  return `Click ${humanizeLabel(trimmed)}`;
}

export function enterStep(label: string): string {
  return `Enter ${humanizeLabel(label)}`;
}

export function selectStep(value: string, context?: string): string {
  const ctx = context ? ` in ${humanizeLabel(context)}` : '';
  return `Select "${value}"${ctx}`;
}

export function verifyStep(description: string): string {
  return description.startsWith('Verify') ? description : `Verify ${description}`;
}

export function openStep(description: string): string {
  return description.startsWith('Open') ? description : `Open ${description}`;
}

export function waitStep(description: string): string {
  return description.startsWith('Wait') ? description : `Wait for ${description}`;
}
