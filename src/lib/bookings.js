import { STATUS_TRANSITIONS } from './constants.js';
import { db } from './store.js';
import { findConflict } from './domain.js';

/** Guarded status transition shared by every role's UI. */
export async function setBookingStatus(booking, nextStatus) {
  const allowed = STATUS_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Status "${booking.status}" tidak dapat diubah menjadi "${nextStatus}".`);
  }
  return db.update('bookings', booking.id, {
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  });
}

export async function assignOperator(booking, bookings, operatorId) {
  if (operatorId) {
    const conflict = findConflict(bookings, {
      unitId: booking.unitId,
      operatorId,
      startDate: booking.startDate,
      days: booking.days,
      ignoreId: booking.id,
    });
    if (!conflict.ok) throw new Error(conflict.message);
  }
  return db.update('bookings', booking.id, {
    operatorId: operatorId || null,
    updatedAt: new Date().toISOString(),
  });
}
