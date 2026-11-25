import { setBookingStatus } from '../../lib/bookings.js';
import { confirmDialog, toast } from '../../ui/overlay.js';

const TARGET = { approve: 'approved', reject: 'rejected', start: 'in_progress', complete: 'completed' };
const MESSAGES = {
  approve: 'Pesanan disetujui.',
  reject: 'Pesanan ditolak.',
  start: 'Pekerjaan ditandai berjalan.',
  complete: 'Pekerjaan ditandai selesai.',
};

/** Performs an admin status action, asking for confirmation on destructive ones. */
export async function announceStatusChange(booking, action) {
  const next = TARGET[action];
  if (!next) throw new Error('Aksi tidak dikenal.');

  if (action === 'reject') {
    return new Promise((resolve) => {
      confirmDialog({
        title: `Tolak ${booking.code}?`,
        message:
          'Petani akan melihat status ditolak. Slot jadwal unit dibebaskan untuk pengajuan lain.',
        confirmLabel: 'Tolak pesanan',
        onConfirm: async () => {
          await setBookingStatus(booking, 'rejected');
          toast(MESSAGES.reject);
          resolve(true);
        },
      });
    });
  }

  await setBookingStatus(booking, next);
  toast(MESSAGES[action] || 'Status diperbarui.');
  return true;
}
