/**
 * Password hashing built on Web Crypto (PBKDF2-SHA256).
 * Kept browser-only on purpose: in a real deployment the same derivation must
 * run on the server, and this module is the single place to swap.
 */

const ITERATIONS = 150_000;
const KEY_LENGTH = 256;

function toHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function subtle() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto tidak tersedia. Jalankan aplikasi melalui HTTPS atau localhost.');
  }
  return globalThis.crypto.subtle;
}

async function derive(password, saltBytes) {
  const key = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_LENGTH,
  );
  return toHex(new Uint8Array(bits));
}

/** Returns { hash, salt } — both hex strings. */
export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(String(password), salt);
  return { hash, salt: toHex(salt) };
}

export async function verifyPassword(password, stored) {
  if (!stored?.hash || !stored?.salt) return false;
  const { hash } = await hashPassword(password, stored.salt);
  if (hash.length !== stored.hash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hash.length; i += 1) {
    mismatch |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Minimum viable password policy, surfaced in the registration form. */
export function passwordIssues(password) {
  const value = String(password || '');
  const issues = [];
  if (value.length < 8) issues.push('minimal 8 karakter');
  if (!/[A-Za-z]/.test(value)) issues.push('mengandung huruf');
  if (!/\d/.test(value)) issues.push('mengandung angka');
  return issues;
}
