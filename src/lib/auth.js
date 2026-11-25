import { NAMESPACE, db, initStore } from './store.js';
import { hashPassword, passwordIssues, verifyPassword } from './password.js';
import { isValidEmail, normalizeEmail, uid } from './utils.js';
import { SESSION_TTL_MS } from './constants.js';

const SESSION_KEY = `${NAMESPACE}.session`;

export class AuthError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'AuthError';
    this.field = field || null;
  }
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.userId || !session?.expiresAt) return null;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(user) {
  const session = {
    userId: user.id,
    role: user.role,
    token: crypto.randomUUID(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  return readSession();
}

/** Resolves the signed-in user, or null when the session is missing/expired. */
export async function getCurrentUser() {
  await initStore();
  const session = readSession();
  if (!session) return null;
  const user = await db.find('users', session.userId);
  if (!user || user.status !== 'active') {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return user;
}

export async function login(email, password) {
  await initStore();
  const normalized = normalizeEmail(email);
  if (!normalized || !password) {
    throw new AuthError('Email dan kata sandi wajib diisi.', !normalized ? 'email' : 'password');
  }

  const users = await db.all('users');
  const user = users.find((row) => normalizeEmail(row.email) === normalized);
  const ok = user ? await verifyPassword(password, user) : false;
  if (!user || !ok) {
    throw new AuthError('Email atau kata sandi salah.');
  }
  if (user.status !== 'active') {
    throw new AuthError('Akun ini dinonaktifkan. Hubungi admin KUD.');
  }

  writeSession(user);
  return user;
}

export async function register({ name, email, phone, region, password, passwordConfirm, agreement }) {
  await initStore();

  if (!String(name || '').trim() || String(name).trim().length < 3) {
    throw new AuthError('Nama lengkap minimal 3 karakter.', 'name');
  }
  if (!isValidEmail(email)) {
    throw new AuthError('Format email belum valid.', 'email');
  }
  if (String(phone || '').replace(/\D/g, '').length < 9) {
    throw new AuthError('Nomor WhatsApp minimal 9 digit angka.', 'phone');
  }
  if (!region) {
    throw new AuthError('Pilih wilayah layanan.', 'region');
  }
  const issues = passwordIssues(password);
  if (issues.length) {
    throw new AuthError(`Kata sandi ${issues.join(', ')}.`, 'password');
  }
  if (password !== passwordConfirm) {
    throw new AuthError('Konfirmasi kata sandi tidak sama.', 'passwordConfirm');
  }
  if (!agreement) {
    throw new AuthError('Setujui ketentuan layanan untuk melanjutkan.', 'agreement');
  }

  const users = await db.all('users');
  if (users.some((row) => normalizeEmail(row.email) === normalizeEmail(email))) {
    throw new AuthError('Email sudah terdaftar. Silakan masuk.', 'email');
  }

  const { hash, salt } = await hashPassword(password);
  const now = new Date().toISOString();
  const user = {
    id: uid('usr'),
    name: String(name).trim(),
    email: normalizeEmail(email),
    phone: String(phone).trim(),
    region,
    role: 'farmer', // self-registration can never escalate privileges
    status: 'active',
    organization: '',
    createdAt: now,
    hash,
    salt,
  };

  await db.insert('users', user);
  writeSession(user);
  return user;
}

export async function changePassword(userId, currentPassword, nextPassword) {
  await initStore();
  const user = await db.find('users', userId);
  if (!user) throw new AuthError('Akun tidak ditemukan.');
  const ok = await verifyPassword(currentPassword, user);
  if (!ok) throw new AuthError('Kata sandi saat ini salah.', 'currentPassword');
  const issues = passwordIssues(nextPassword);
  if (issues.length) throw new AuthError(`Kata sandi baru ${issues.join(', ')}.`, 'nextPassword');
  const { hash, salt } = await hashPassword(nextPassword);
  await db.update('users', userId, { hash, salt, passwordChangedAt: new Date().toISOString() });
}

/** Used only by admins creating an operator/admin account. */
export async function createStaffAccount({
  name,
  email,
  phone,
  region,
  role,
  password,
  organization,
  wagePerDay,
}) {
  await initStore();
  if (!['operator', 'admin'].includes(role)) {
    throw new AuthError('Peran staf tidak valid.');
  }
  if (!String(name || '').trim()) throw new AuthError('Nama wajib diisi.', 'name');
  if (!isValidEmail(email)) throw new AuthError('Format email belum valid.', 'email');
  if (passwordIssues(password).length) {
    throw new AuthError(`Kata sandi ${passwordIssues(password).join(', ')}.`, 'password');
  }
  const users = await db.all('users');
  if (users.some((row) => normalizeEmail(row.email) === normalizeEmail(email))) {
    throw new AuthError('Email sudah terdaftar.', 'email');
  }
  const { hash, salt } = await hashPassword(password);
  const now = new Date().toISOString();
  const user = {
    id: uid('usr'),
    name: String(name).trim(),
    email: normalizeEmail(email),
    phone: String(phone || '').trim(),
    region: region || '',
    organization: organization || '',
    role,
    status: 'active',
    createdAt: now,
    hash,
    salt,
    ...(role === 'operator'
      ? { skills: [], wagePerDay: Number(wagePerDay) || 150000, available: true }
      : {}),
  };
  await db.insert('users', user);
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
