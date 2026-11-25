import { buildSeedData } from '../data/seed.js';
import { hashPassword } from './password.js';

/**
 * Persistence layer.
 *
 * Every read/write goes through this module so the storage engine can be
 * swapped for a real HTTP API later without touching a single view: each
 * method is already async and returns plain JSON-serialisable records.
 */

const NAMESPACE = 'armadatani.v2';
const META_KEY = `${NAMESPACE}.meta`;
const COLLECTIONS = ['users', 'units', 'packages', 'bookings', 'fuelLogs', 'favorites'];

export function storageKey(name) {
  return `${NAMESPACE}.${name}`;
}

function readCollection(name) {
  try {
    const raw = localStorage.getItem(storageKey(name));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`[store] gagal membaca "${name}"`, error);
    return [];
  }
}

function writeCollection(name, rows) {
  localStorage.setItem(storageKey(name), JSON.stringify(rows));
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

let initialization = null;

async function seed(force = false) {
  if (!force && localStorage.getItem(META_KEY)) return false;

  const seedData = await buildSeedData();
  const users = await Promise.all(
    seedData.users.map(async ({ demoPassword, ...user }) => ({
      ...user,
      ...(await hashPassword(demoPassword)),
    })),
  );

  writeCollection('users', users);
  writeCollection('units', seedData.units);
  writeCollection('packages', seedData.packages);
  writeCollection('bookings', seedData.bookings);
  writeCollection('fuelLogs', seedData.fuelLogs);
  writeCollection('favorites', seedData.favorites);

  localStorage.setItem(
    META_KEY,
    JSON.stringify({ version: 2, seededAt: new Date().toISOString() }),
  );
  return true;
}

/** Idempotent bootstrap — safe to call on every app start. */
export function initStore() {
  if (!initialization) {
    initialization = seed(false).catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

export const db = {
  /** Raw collection snapshot (a defensive copy). */
  async all(name) {
    if (!COLLECTIONS.includes(name)) throw new Error(`Koleksi tidak dikenal: ${name}`);
    await initStore();
    return clone(readCollection(name));
  },

  async find(name, id) {
    const rows = await db.all(name);
    return rows.find((row) => row.id === id) || null;
  },

  async insert(name, record) {
    await initStore();
    const rows = readCollection(name);
    if (rows.some((row) => row.id === record.id)) {
      throw new Error(`Data dengan id "${record.id}" sudah ada.`);
    }
    rows.push(clone(record));
    writeCollection(name, rows);
    return clone(record);
  },

  async update(name, id, patch) {
    await initStore();
    const rows = readCollection(name);
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) throw new Error(`Data "${id}" tidak ditemukan.`);
    rows[index] = { ...rows[index], ...clone(patch) };
    writeCollection(name, rows);
    return clone(rows[index]);
  },

  async remove(name, id) {
    await initStore();
    const rows = readCollection(name);
    const next = rows.filter((row) => row.id !== id);
    writeCollection(name, next);
    return next.length !== rows.length;
  },

  async replace(name, rows) {
    await initStore();
    writeCollection(name, clone(rows));
    return clone(rows);
  },

  /** Clears the session and re-seeds all demo data. */
  async resetDemoData() {
    COLLECTIONS.forEach((name) => localStorage.removeItem(storageKey(name)));
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(`${NAMESPACE}.session`);
    initialization = null;
    await initStore();
  },

  namespace: NAMESPACE,
};

export { NAMESPACE };
