import { BOOKING_STATUS, BOOKING_STATUS_OPTIONS } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { assignOperator } from '../../lib/bookings.js';
import { bookingStatusMeta } from '../../lib/domain.js';
import { announceStatusChange } from './_actions.js';
import {
  esc,
  formatDateTime,
  formatRange,
  mapsUrlFromCoords,
  rupiah,
} from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { bookingStatusBadge, emptyState, tabs } from '../../ui/kit.js';
import { openModal, toast } from '../../ui/overlay.js';

const ACTION_LABELS = {
  approve: 'Setujui',
  reject: 'Tolak',
  start: 'Mulai pekerjaan',
  complete: 'Selesaikan',
};

function availableActions(status) {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return ['start'];
  if (status === 'in_progress') return ['complete'];
  return [];
}

export async function render(ctx) {
  const [bookings, units, users] = await Promise.all([
    db.all('bookings'),
    db.all('units'),
    db.all('users'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const operators = users.filter((u) => u.role === 'operator' && u.status === 'active');

  const state = { status: 'all', query: '' };

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Verifikasi</span>
        <h1>Pesanan masuk</h1>
        <p>Setujui, tolak, tugaskan operator, lalu jalankan pekerjaan sampai selesai.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/admin/armada">Ketersediaan unit</a>
      </div>
    </div>

    <div id="booking-tabs">${tabs(
      [
        { value: 'all', label: 'Semua' },
        ...BOOKING_STATUS_OPTIONS.map((value) => ({
          value,
          label: BOOKING_STATUS[value].label,
        })),
      ],
      state.status,
    )}</div>

    <div class="toolbar">
      <div class="field is-search">
        <label for="adm-search">Cari kode / petani / unit</label>
        <input class="input" id="adm-search" type="search" placeholder="Contoh: BK-0001, Darmawan, traktor" />
      </div>
      <div class="toolbar-result" id="adm-count"></div>
    </div>

    <section class="card card-pad">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Petani</th>
              <th>Unit &amp; operator</th>
              <th>Jadwal</th>
              <th>Nilai</th>
              <th>Status</th>
              <th style="text-align:right">Aksi</th>
            </tr>
          </thead>
          <tbody id="booking-rows"></tbody>
        </table>
      </div>
      <div id="booking-empty"></div>
    </section>
  `;

  const renderRows = (root) => {
    const tbody = root.querySelector('#booking-rows');
    const emptySlot = root.querySelector('#booking-empty');
    const count = root.querySelector('#adm-count');

    const rows = bookings
      .filter((b) => (state.status === 'all' ? true : b.status === state.status))
      .filter((b) => {
        if (!state.query) return true;
        const unit = unitById.get(b.unitId);
        const haystack = `${b.code} ${b.farmerName} ${b.organization} ${unit?.name} ${unit?.region}`.toLowerCase();
        return haystack.includes(state.query.toLowerCase());
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    count.textContent = `${rows.length} pesanan`;

    if (!rows.length) {
      tbody.innerHTML = '';
      emptySlot.innerHTML = emptyState({
        title: 'Tidak ada pesanan pada filter ini',
        description: 'Ubah filter status atau kata kunci pencarian.',
        iconName: 'clipboard',
      });
      return;
    }

    emptySlot.innerHTML = '';
    tbody.innerHTML = rows
      .map((booking) => {
        const unit = unitById.get(booking.unitId);
        const operator = userById.get(booking.operatorId);
        const actions = availableActions(booking.status);
        return `<tr>
          <td>
            <div class="cell-stack">
              <strong>${esc(booking.code)}</strong>
              <span>${esc(formatDateTime(booking.createdAt))}</span>
            </div>
          </td>
          <td>
            <div class="cell-stack">
              <strong>${esc(booking.farmerName)}</strong>
              <span>${esc(booking.organization || 'Petani mandiri')}</span>
            </div>
          </td>
          <td>
            <div class="cell-stack">
              ${esc(unit?.name || '—')}
              <span>${esc(operator?.name || 'Lepas kunci')} · ${esc(booking.terrain)}</span>
            </div>
          </td>
          <td>${esc(formatRange(booking.startDate, booking.days))}<div class="text-xs text-muted">${esc(
            booking.days,
          )} hari</div></td>
          <td class="mono">${rupiah(booking.totalCost)}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td class="actions">
            <button type="button" class="btn btn-outline btn-sm" data-booking-detail="${esc(
              booking.id,
            )}">Detail</button>
            ${actions
              .map(
                (action) =>
                  `<button type="button" class="btn ${
                    action === 'reject' ? 'btn-danger' : 'btn-primary'
                  } btn-sm" data-booking-action="${action}" data-booking-id="${esc(booking.id)}">${
                    ACTION_LABELS[action]
                  }</button>`,
              )
              .join(' ')}
          </td>
        </tr>`;
      })
      .join('');
  };

  return {
    title: 'Pesanan masuk',
    html: content,
    bind(root, viewCtx) {
      renderRows(root);

      root.querySelector('#booking-tabs').addEventListener('click', (event) => {
        const btn = event.target.closest('[data-tab]');
        if (!btn) return;
        state.status = btn.dataset.tab;
        root.querySelectorAll('#booking-tabs [data-tab]').forEach((el) => {
          el.classList.toggle('is-active', el === btn);
          el.setAttribute('aria-selected', String(el === btn));
        });
        renderRows(root);
      });

      root.querySelector('#adm-search').addEventListener('input', (event) => {
        state.query = event.target.value.trim();
        renderRows(root);
      });

      root.addEventListener('click', async (event) => {
        const detailBtn = event.target.closest('[data-booking-detail]');
        if (detailBtn) {
          const booking = bookings.find((b) => b.id === detailBtn.dataset.bookingDetail);
          if (!booking) return;
          const unit = unitById.get(booking.unitId);
          const operator = userById.get(booking.operatorId);
          const maps = mapsUrlFromCoords(booking.coords);

          openModal({
            title: `Pesanan ${booking.code}`,
            subtitle: `${bookingStatusMeta(booking.status).label} · ${rupiah(booking.totalCost)}`,
            wide: true,
            submitLabel: 'Simpan penugasan',
            body: `<div data-modal-error></div>
              <div class="meta-grid">
                <div class="meta-box"><span>Unit</span><strong>${esc(unit?.name || '—')}</strong></div>
                <div class="meta-box"><span>Wilayah</span><strong>${esc(unit?.region || '—')}</strong></div>
                <div class="meta-box"><span>Jadwal</span><strong>${esc(
                  formatRange(booking.startDate, booking.days),
                )}</strong></div>
                <div class="meta-box"><span>Skema</span><strong>${
                  booking.pricingMode === 'full' ? 'Paket lengkap' : 'Lepas kunci'
                }</strong></div>
              </div>
              <dl class="kv">
                <div class="kv-row"><dt>Petani</dt><dd>${esc(booking.farmerName)}</dd></div>
                <div class="kv-row"><dt>Organisasi</dt><dd>${esc(booking.organization || '—')}</dd></div>
                <div class="kv-row"><dt>Kontak</dt><dd>${esc(booking.contact || '—')}</dd></div>
                <div class="kv-row"><dt>Lokasi</dt><dd>${esc(booking.location)}</dd></div>
                <div class="kv-row"><dt>Kuantitas</dt><dd>${esc(booking.quantity)} ${esc(
                  unit?.scheme === 'per_ha' ? 'ha' : unit?.scheme === 'per_hour' ? 'jam' : 'ritase',
                )} / hari</dd></div>
                <div class="kv-row"><dt>Operator saat ini</dt><dd>${esc(
                  operator?.name || 'Lepas kunci',
                )}</dd></div>
                <div class="kv-row"><dt>Catatan petani</dt><dd>${esc(booking.notes || '—')}</dd></div>
              </dl>
              ${
                maps
                  ? `<a class="btn btn-outline btn-sm" href="${maps}" target="_blank" rel="noopener noreferrer">Buka koordinat lahan ↗</a>`
                  : ''
              }
              <div class="field">
                <label for="assign-operator">Tugaskan operator</label>
                <select id="assign-operator" name="operatorId">
                  <option value="">Lepas kunci — tanpa operator</option>
                  ${operators
                    .map(
                      (op) =>
                        `<option value="${esc(op.id)}"${
                          op.id === booking.operatorId ? ' selected' : ''
                        }>${esc(op.name)} — ${esc(op.region)} · ${rupiah(op.wagePerDay || 0)}/hari</option>`,
                    )
                    .join('')}
                </select>
                <span class="field-hint">Sistem menolak operator yang sudah punya tugas pada tanggal yang sama.</span>
              </div>
            `,
            onSubmit: async (form) => {
              const operatorId = form.elements.operatorId.value || null;
              await assignOperator(booking, bookings, operatorId);
              toast('Penugasan operator diperbarui.');
              await viewCtx.refresh();
            },
          });
          return;
        }

        const actionBtn = event.target.closest('[data-booking-action]');
        if (actionBtn) {
          const booking = bookings.find((b) => b.id === actionBtn.dataset.bookingId);
          if (!booking) return;
          try {
            actionBtn.disabled = true;
            await announceStatusChange(booking, actionBtn.dataset.bookingAction);
            await viewCtx.refresh();
          } catch (error) {
            actionBtn.disabled = false;
            toast(error.message || 'Aksi gagal.', 'error');
          }
        }
      });
    },
  };
}
