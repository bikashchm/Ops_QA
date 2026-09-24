/**
 * Generates a unique Yopmail identity for Create New User flows.
 * Email / username / first / last are random every call (app rejects duplicate credentials).
 * Never reuse a fixed address like "rock12@yopmail.com" or "rocky@yopmail.com".
 */

export interface GeneratedYopmailUser {
  /** Unique local-part used for yopmail inbox (letters only). */
  baseName: string;
  userName: string;
  email: string;
  firstName: string;
  /** Letters only, always ≥ 2 characters (UI rejects digits/special chars). */
  lastName: string;
  /** Role selected on Add User (Admin | Data Engineer | Field Engineer). */
  role: string;
  linqxSoftware: string;
}

export type CreateUserRole = 'Admin' | 'Data Engineer' | 'Field Engineer';

export const CREATE_USER_ROLES: readonly CreateUserRole[] = [
  'Admin',
  'Data Engineer',
  'Field Engineer',
] as const;

/** In-process guard so the same run never emits a duplicate email. */
const usedEmails = new Set<string>();
let sequence = 0;

function randomLetters(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Encodes a number as base-26 letters (a–z) for uniqueness without digits. */
function toBase26Letters(value: number): string {
  let n = Math.abs(Math.floor(value));
  if (n === 0) {
    return 'a';
  }
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let out = '';
  while (n > 0) {
    out = alphabet[n % 26] + out;
    n = Math.floor(n / 26);
  }
  return out;
}

/**
 * Builds a collision-resistant alphabetic token:
 * timestamp + sequence + random letters.
 */
function uniqueAlphaToken(): string {
  sequence += 1;
  const timePart = toBase26Letters(Date.now()).slice(-6);
  const seqPart = toBase26Letters(sequence);
  const randomPart = randomLetters(4);
  return `${timePart}${seqPart}${randomPart}`;
}

/**
 * @param prefix Human-readable prefix (e.g. "rocky") — a unique alphabetic suffix is always appended.
 * @param role Role to select on Add User (Admin | Data Engineer | Field Engineer).
 * Every call returns a new email that has not been generated earlier in this process.
 */
export function generateYopmailUser(
  prefix = 'rocky',
  role: CreateUserRole = 'Admin',
): GeneratedYopmailUser {
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z]/g, '') || 'user';

  let baseName = '';
  let email = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    baseName = `${cleanPrefix}${uniqueAlphaToken()}`.toLowerCase();
    email = `${baseName}@yopmail.com`;
    if (!usedEmails.has(email)) {
      break;
    }
  }

  if (usedEmails.has(email)) {
    throw new Error(`Failed to generate a unique Yopmail email after retries (last=${email})`);
  }
  usedEmails.add(email);

  // First / last are independently random each run (letters only; last ≥ 2).
  const firstName = randomLetters(5 + Math.floor(Math.random() * 3)); // 5–7 letters
  let lastName = randomLetters(2 + Math.floor(Math.random() * 2)); // 2–3 letters
  if (lastName.length < 2) {
    lastName = randomLetters(2);
  }

  return {
    baseName,
    userName: baseName,
    email,
    firstName,
    lastName,
    role,
    linqxSoftware: 'Live+',
  };
}

/** Test helper — clears the in-process uniqueness set (not needed in normal runs). */
export function resetGeneratedYopmailEmailsForTests(): void {
  usedEmails.clear();
  sequence = 0;
}

/**
 * Generates a unique password that satisfies typical Azure B2C policy
 * (upper, lower, digit, special). Used after YOPmail temp-password login.
 */
export function generateSecurePassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '#@$!&*';
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const core = randomLetters(6) + toBase26Letters(Date.now()).slice(-4);
  return `${pick(upper)}${pick(lower)}${core}${pick(digits)}${pick(special)}`;
}
