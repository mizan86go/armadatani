import { ACTIVE_BOOKING_STATUSES } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { bookingEndDate, bookingStatusMeta } from '../../lib/domain.js';
import { esc, formatRange, mapsUrlFromCoords, rupiah } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { bookingStatusBadge, emptyState, tabs } from '../../ui/kit.js';
import { confirmDialog, openModal, toast } from '../../ui/overlay.js';

const TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'completed', label: 'Selesai' },
  { value: 'closed', label: 'Dibatalkan / ditolak' },
];

function inTab(booking, tab) {
  if (tab === 'active') return ACTIVE_BOOKING_STATUSES.includes(booking.status);
  if (tab === 'completed') return booking.status === 'completed';
  if (tab === 'closed') return ['cancelled', 'rejected'].includes(booking.status);
  return true;
}

function orderCard(booking, unit, operator) {
  const canCancel = ['pending', 'approved'].includes(booking.status);
  return `
    <article class="card card-pad stack" data-order="${esc(booking.id)}">
      <div class="spread">
        <div>
          <div class="row">
            <strong style="font-size:0.95rem">${esc(booking.code)}</strong>
            ${bookingStatusBadge(booking.status)}
          </div>
          <p class="text-sm text-muted">${esc(unit?.name || 'Unit tidak tersedia')} · ${esc(
            unit?.region || '—',
          )}</p>
        </div>
        <div style="text-align:right">
          <strong style="font-size:1rem">${rupiah(booking.totalCost)}</strong>
          <div class="text-xs text-muted">${
            booking.pricingMode === 'full' ? 'Paket lengkap' : 'Lepas kunci'
          }</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box"><span>Jadwal</span><strong>${esc(
          formatRange(booking.startDate, booking.days),
        )}</strong></div>
        <div class="meta-box"><span>Durasi</span><strong>${esc(booking.days)} hari</strong></div>
        <div class="meta-box"><span>Operator</span><strong>${esc(
          operator?.name || 'Lepas kunci',
        )}</strong></div>
        <div class="meta-box"><span>Lokasi</span><strong>${esc(booking.location)}</strong></div>
      </div>

      <div class="row">
        <button type="button" class="btn btn-outline btn-sm" data-order-detail="${esc(
          booking.id,
        )}">Detail pesanan</button>
        ${
          canCancel
            ? `<button type="button" class="btn btn-danger btn-sm" data-order-cancel="${esc(
                booking.id,
              )}">Batalkan</button>`
            : ''
        }
        ${
          booking.status === 'pending'
            ? '<span class="text-xs text-muted">Menunggu verifikasi admin KUD</span>'
            : ''
        }
      </div>
    </article>
  `;
}

export async function render(ctx) {
  const { user } = ctx;
  const [bookings, units, users] = await Promise.all([
    db.all('bookings'),
    db.all('units'),
    db.all('users'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const mine = bookings
    .filter((b) => b.farmerId === user.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  let activeTab = 'all';

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Riwayat sewa</span>
        <h1>Pesanan saya</h1>
        <p>${mine.length} pengajuan tercatat. Status berubah setelah admin KUD memverifikasi.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-primary" href="#/petani/sewa">${icon('plus', 16)} Ajukan sewa baru</a>
      </div>
    </div>

    <div id="orders-tabs">${tabs(
      TABS.map((tab) => ({
        ...tab,
        count: mine.filter((b) => inTab(b, tab.value)).length,
      })),
      activeTab,
    )}</div>

    <div class="stack" id="orders-list"></div>
  `;

  return {
    title: 'Pesanan saya',
    html: content,
    bind(root) {
      const list = root.querySelector('#orders-list');
      const tabHost = root.querySelector('#orders-tabs');

      const renderList = () => {
        const rows = mine.filter((b) => inTab(b, activeTab));
        list.innerHTML = rows.length
          ? rows
              .map((b) =>
                orderCard(b, unitById.get(b.unitId), userById.get(b.operatorId) || null),
              )
              .join('')
          : emptyState({
              title: 'Belum ada pesanan di kategori ini',
              description: 'Ajukan sewa alat dari katalog atau kalender ketersediaan.',
              actionLabel: 'Buka katalog',
              actionAttr: 'data-nav="/petani/katalog"',
              iconName: 'clipboard',
            });
      };

      tabHost.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-tab]');
        if (!btn) return;
        activeTab = btn.dataset.tab;
        tabHost.querySelectorAll('[data-tab]').forEach((el) => {
          el.classList.toggle('is-active', el === btn);
          el.setAttribute('aria-selected', String(el === btn));
        });
        renderList();
      });

      list.addEventListener('click', (event) => {
        const detailBtn = event.target.closest('[data-order-detail]');
        if (detailBtn) {
          const booking = mine.find((b) => b.id === detailBtn.dataset.orderDetail);
          if (!booking) return;
          const unit = unitById.get(booking.unitId);
          const operator = userById.get(booking.operatorId);
          const maps = mapsUrlFromCoords(booking.coords);
          openModal({
            title: `Pesanan ${booking.code}`,
            subtitle: bookingStatusMeta(booking.status).label,
            wide: true,
            body: `
              <div class="meta-grid">
                <div class="meta-box"><span>Unit</span><strong>${esc(unit?.name || '—')}</strong></div>
                <div class="meta-box"><span>Wilayah</span><strong>${esc(unit?.region || '—')}</strong></div>
                <div class="meta-box"><span>Tanggal</span><strong>${esc(
                  formatRange(booking.startDate, booking.days),
                )}</strong></div>
                <div class="meta-box"><span>Berakhir</span><strong>${esc(
                  bookingEndDate(booking),
                )}</strong></div>
                <div class="meta-box"><span>Durasi</span><strong>${esc(booking.days)} hari</strong></div>
                <div class="meta-box"><span>Operator</span><strong>${esc(
                  operator?.name || 'Lepas kunci',
                )}</strong></div>
                <div class="meta-box"><span>Skema tarif</span><strong>${
                  booking.pricingMode === 'full' ? 'Paket lengkap' : 'Lepas kunci'
                }</strong></div>
                <div class="meta-box"><span>Medan</span><strong>${esc(booking.terrain || '—')}</strong></div>
              </div>
              <dl class="kv">
                <div class="kv-row"><dt>Lokasi lahan</dt><dd>${esc(booking.location)}</dd></div>
                <div class="kv-row"><dt>Kontak</dt><dd>${esc(booking.contact || '—')}</dd></div>
                <div class="kv-row"><dt>Estimasi biaya</dt><dd>${rupiah(booking.totalCost)}</dd></div>
                <div class="kv-row"><dt>Catatan</dt><dd>${esc(booking.notes || '—')}</dd></div>
              </dl>
              ${
                maps
                  ? `<a class="btn btn-outline btn-sm" href="${maps}" target="_blank" rel="noopener noreferrer">Buka koordinat lahan ↗</a>`
                  : '<p class="text-xs text-muted">Koordinat lahan belum diisi.</p>'
              }
            `,
            footer: '<button type="button" class="btn btn-outline" data-modal-close>Tutup</button>',
          });
          return;
        }

        const cancelBtn = event.target.closest('[data-order-cancel]');
        if (cancelBtn) {
          const booking = mine.find((b) => b.id === cancelBtn.dataset.orderCancel);
          if (!booking) return;
          confirmDialog({
            title: `Batalkan ${booking.code}?`,
            message:
              'Slot jadwal akan dibebaskan untuk petani lain. Tindakan ini tidak dapat dibatalkan.',
            confirmLabel: 'Ya, batalkan pesanan',
            onConfirm: async () => {
              await db.update('bookings', booking.id, {
                status: 'cancelled',
                updatedAt: new Date().toISOString(),
              });
              booking.status = 'cancelled';
              toast(`${booking.code} dibatalkan.`);
              renderList();
            },
          });
        }
      });

      renderList();
    },
  };
}
