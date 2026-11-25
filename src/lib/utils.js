/** Small shared helpers: escaping, formatting, dates and DOM utilities. */

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

export function rupiah(value) {
  const n = Number(value) || 0;
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

export function compactRupiah(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)} rb`;
  return `Rp ${n}`;
}

export function roundTo(n, step = 1000) {
  return Math.round((Number(n) || 0) / step) * step;
}

export function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

const MS_DAY = 24 * 60 * 60 * 1000;

/**
 * Formats a Date as YYYY-MM-DD using *local* calendar parts.
 * `toISOString()` would shift the day backwards for UTC+ timezones, which
 * silently broke booking overlap checks and the availability calendar.
 */
export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDaysISO(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + Number(days || 0));
  return toISODate(date);
}

export function diffDays(fromISO, toISO) {
  const from = Date.parse(`${fromISO}T00:00:00Z`);
  const to = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((to - from) / MS_DAY);
}

const DATE_FMT = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const DATE_FMT_SHORT = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' });
const DAY_FMT = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });

export function formatDate(iso) {
  if (!iso) return '—';
  return DATE_FMT.format(parseISODate(iso));
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return DATE_FMT_SHORT.format(parseISODate(iso));
}

export function formatWeekday(iso) {
  return DAY_FMT.format(parseISODate(iso));
}

export function formatRange(startISO, days) {
  if (!startISO) return '—';
  const end = addDaysISO(startISO, Math.max(1, Number(days || 1)) - 1);
  return startISO === end ? formatDate(startISO) : `${formatDate(startISO)} – ${formatDate(end)}`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${DATE_FMT.format(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

export function sequenceCode(prefix, existing, digits = 4) {
  const max = existing.reduce((acc, item) => {
    const match = String(item?.code || '').match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(digits, '0')}`;
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(email || '').trim());
}

/** Accepts "5.5483,95.3238" and returns a Google Maps query URL, or null. */
export function mapsUrlFromCoords(coords) {
  const match = String(coords || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  return `https://www.google.com/maps?q=${match[1]},${match[2]}`;
}

export function debounce(fn, delay = 220) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function on(root, eventName, selector, handler) {
  root.addEventListener(eventName, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

export function escapeAttr(value) {
  return esc(value);
}
