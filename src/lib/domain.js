import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUS,
  FUEL_PRICES,
  MAX_BOOKING_DAYS,
  UNIT_SCHEMES,
  UNIT_STATUS,
} from './constants.js';
import { addDaysISO, clamp, roundTo } from './utils.js';

export function schemeLabel(scheme) {
  return UNIT_SCHEMES[scheme]?.label || '';
}

export function schemeUnit(scheme) {
  return UNIT_SCHEMES[scheme]?.unit || 'unit';
}

export function unitStatusMeta(status) {
  return UNIT_STATUS[status] || { label: status, tone: 'neutral' };
}

export function bookingStatusMeta(status) {
  return BOOKING_STATUS[status] || { label: status, tone: 'neutral' };
}

export function defaultFuelPrice(unit) {
  return FUEL_PRICES[unit?.fuelType] ?? FUEL_PRICES.Solar;
}

/** Service progress in percent, capped at 100. */
export function serviceProgress(unit) {
  if (!unit?.nextServiceAt) return 0;
  return clamp(Math.round((unit.operatingHours / unit.nextServiceAt) * 100), 0, 100);
}

/**
 * Single source of truth for rental pricing.
 * Base rate always covers the bare unit; the "full" mode adds fuel and, when an
 * operator is assigned, their daily wage.
 */
export function computeQuote(unit, options = {}) {
  const days = clamp(options.days ?? 1, 1, MAX_BOOKING_DAYS);
  const quantity = Math.max(Number(options.quantity) || 1, 0.5);
  const terrainFactor = Number(options.terrainFactor) || 1;
  const mode = options.mode === 'full' ? 'full' : 'base';
  const fuelPrice = Number(options.fuelPrice) || defaultFuelPrice(unit);
  const operatorWage = Number(options.operatorWage) || 0;

  const base = Math.round(unit.baseRate * quantity * days);
  const liters = Math.round((unit.fuelRate || 0) * quantity * days * terrainFactor * 10) / 10;
  const fuelCost = Math.round(liters * fuelPrice);
  const wage = mode === 'full' ? operatorWage * days : 0;
  const subtotal = base + (mode === 'full' ? fuelCost + wage : 0);

  return {
    days,
    quantity,
    base,
    liters,
    fuelCost,
    wage,
    subtotal,
    total: roundTo(subtotal, 1000),
    mode,
    fuelPrice,
  };
}

export function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

/**
 * Detects double-booking for a unit and/or operator.
 * Returns { ok: true } or { ok: false, field, message }.
 */
export function findConflict(bookings, { unitId, operatorId, startDate, days, ignoreId = null }) {
  const duration = Number(days);
  if (!startDate) return { ok: false, field: 'startDate', message: 'Tanggal mulai wajib diisi.' };
  if (!Number.isFinite(duration) || duration < 1 || duration > MAX_BOOKING_DAYS) {
    return { ok: false, field: 'days', message: `Durasi sewa harus 1–${MAX_BOOKING_DAYS} hari.` };
  }

  const endDate = addDaysISO(startDate, duration - 1);
  const active = bookings.filter(
    (b) => b.id !== ignoreId && ACTIVE_BOOKING_STATUSES.includes(b.status),
  );

  const unitClash = active.find(
    (b) =>
      b.unitId === unitId &&
      rangesOverlap(
        startDate,
        endDate,
        b.startDate,
        endOfBooking(b.startDate, b.days),
      ),
  );
  if (unitClash) {
    return {
      ok: false,
      field: 'startDate',
      message: `Unit sudah dipesan pada ${unitClash.code} (${unitClash.startDate} s.d. ${endOfBooking(
        unitClash.startDate,
        unitClash.days,
      )}). Pilih tanggal lain.`,
    };
  }

  if (operatorId) {
    const operatorClash = active.find(
      (b) =>
        b.operatorId === operatorId &&
        rangesOverlap(
          startDate,
          endDate,
          b.startDate,
          endOfBooking(b.startDate, b.days),
        ),
    );
    if (operatorClash) {
      return {
        ok: false,
        field: 'operatorId',
        message: `Operator sudah bertugas pada ${operatorClash.code}. Pilih operator lain atau lepas kunci.`,
      };
    }
  }

  return { ok: true, endDate };
}

function endOfBooking(startDate, days) {
  return addDaysISO(startDate, Math.max(1, Number(days) || 1) - 1);
}

export function bookingEndDate(booking) {
  return endOfBooking(booking.startDate, booking.days);
}

/** Builds the availability matrix used by the booking calendar. */
export function buildAvailability(units, bookings, dates) {
  return units.map((unit) => {
    const cells = dates.map((date) => {
      if (unit.status === 'maintenance') return { type: 'service', label: 'Servis' };
      const hit = bookings.find(
        (b) =>
          b.unitId === unit.id &&
          ACTIVE_BOOKING_STATUSES.includes(b.status) &&
          date >= b.startDate &&
          date <= endOfBooking(b.startDate, b.days),
      );
      return hit
        ? { type: 'booked', label: hit.code, bookingId: hit.id }
        : { type: 'free', label: 'Kosong' };
    });
    return { unit, cells };
  });
}

export function formatCapacity(unit) {
  const value = Number(unit.capacity);
  const num = Number.isInteger(value) ? value : String(value).replace('.', ',');
  return `${num} ${unit.capacityUnit}`;
}
