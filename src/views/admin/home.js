import { ACTIVE_BOOKING_STATUSES } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { serviceProgress } from '../../lib/domain.js';
import { announceStatusChange } from './_actions.js';
import { esc, formatRange, rupiah, todayISO } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { bookingStatusBadge, emptyState, progressBar, statCard } from '../../ui/kit.js';

export async function render(ctx) {
  const [units, bookings, users, fuelLogs] = await Promise.all([
    db.all('units'),
    db.all('bookings'),
    db.all('users'),
    db.all('fuelLogs'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const operators = users.filter((u) => u.role === 'operator');
  const farmers = users.filter((u) => u.role === 'farmer');
  const pending = bookings.filter((b) => b.status === 'pending');
  const ready = units.filter((u) => u.status === 'available');
  const contractValue = bookings
    .filter((b) => ['approved', 'in_progress', 'completed'].includes(b.status))
    .reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);
  const revenue = fuelLogs.reduce((sum, log) => sum + (Number(log.revenue) || 0), 0);
  const serviceAlerts = units
    .map((unit) => ({ unit, progress: serviceProgress(unit) }))
    .filter((row) => row.progress >= 80)
    .sort((a, b) => b.progress - a.progress);

  const recent = [...bookings]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 6);

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Konsol KUD · ${esc(ctx.user.organization || 'Admin')}</span>
        <h1>Ringkasan operasional</h1>
        <p>Verifikasi pesanan masuk, pantau kesiapan armada, dan awasi penugasan operator.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/admin/armada">Kelola armada</a>
        <a class="btn btn-primary" href="#/admin/pesanan">${icon('clipboard', 16)} Pesanan masuk${
          pending.length ? ` (${pending.length})` : ''
        }</a>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Unit siap pakai',
        value: `${ready.length}/${units.length}`,
        hint: 'Status tersedia dan tidak diservis',
        iconName: 'truck',
        accent: true,
      })}
      ${statCard({
        label: 'Menunggu verifikasi',
        value: pending.length,
        hint: pending.length ? 'Perlu keputusan admin' : 'Tidak ada antrean',
        iconName: 'clock',
      })}
      ${statCard({
        label: 'Operator aktif',
        value: operators.filter((o) => o.available).length,
        hint: `Dari ${operators.length} operator terdaftar`,
        iconName: 'users',
      })}
      ${statCard({
        label: 'Nilai kontrak',
        value: rupiah(contractValue).replace('Rp ', 'Rp'),
        hint: `Pendapatan tercatat ${rupiah(revenue)}`,
        iconName: 'chart',
      })}
    </div>

    <div class="grid-2" style="align-items:start">
      <section class="card card-pad stack">
        <div class="card-head" style="margin-bottom:0">
          <div><h2>Antrean persetujuan</h2><p>Pesanan baru menunggu keputusan Anda.</p></div>
          ${pending.length ? `<span class="badge badge-warning">${pending.length} baru</span>` : ''}
        </div>
        ${
          pending.length
            ? `<div class="list">
                ${pending
                  .map((booking) => {
                    const unit = unitById.get(booking.unitId);
                    return `<div class="list-item">
                      <div class="list-item-main">
                        <strong>${esc(booking.code)} · ${esc(booking.farmerName)}</strong>
                        <span>${esc(unit?.name || 'Unit')} · ${esc(
                          formatRange(booking.startDate, booking.days),
                        )} · ${rupiah(booking.totalCost)}</span>
                      </div>
                      <div class="row">
                        <button type="button" class="btn btn-primary btn-sm" data-booking-action="approve" data-booking-id="${esc(
                          booking.id,
                        )}">Setujui</button>
                        <button type="button" class="btn btn-danger btn-sm" data-booking-action="reject" data-booking-id="${esc(
                          booking.id,
                        )}">Tolak</button>
                      </div>
                    </div>`;
                  })
                  .join('')}
              </div>`
            : emptyState({
                title: 'Antrean bersih',
                description: 'Semua pengajuan sudah diverifikasi. Pesanan baru akan muncul di sini.',
                iconName: 'check',
              })
        }
      </section>

      <section class="card card-pad stack">
        <div class="card-head" style="margin-bottom:0">
          <div><h2>Perhatian servis</h2><p>Unit mendekati atau melewati batas jam servis.</p></div>
          <a class="btn btn-outline btn-sm" href="#/admin/armada">Kelola</a>
        </div>
        ${
          serviceAlerts.length
            ? serviceAlerts
                .map(
                  ({ unit, progress }) => `
                  <div class="stack" style="gap:.3rem">
                    <div class="spread">
                      <strong style="font-size:.85rem">${esc(unit.name)}</strong>
                      <span class="text-xs ${progress >= 100 ? 'text-muted' : ''}">${progress}%</span>
                    </div>
                    ${progressBar(progress)}
                    <span class="text-xs text-muted">${esc(
                      unit.operatingHours.toLocaleString('id-ID'),
                    )} / ${esc(unit.nextServiceAt.toLocaleString('id-ID'))} jam · ${esc(unit.region)}</span>
                  </div>`,
                )
                .join('')
            : emptyState({
                title: 'Semua unit dalam batas aman',
                description: 'Tidak ada unit yang mendekati jadwal servis.',
                iconName: 'wrench',
              })
        }
      </section>
    </div>

    <section class="card card-pad stack">
      <div class="card-head" style="margin-bottom:0">
        <div><h2>Pesanan terbaru</h2><p>Enam pengajuan terakhir lintas status.</p></div>
        <a class="btn btn-outline btn-sm" href="#/admin/pesanan">Lihat semua</a>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th><th>Petani</th><th>Unit</th><th>Jadwal</th><th>Nilai</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${recent
              .map((booking) => {
                const unit = unitById.get(booking.unitId);
                return `<tr>
                  <td><strong>${esc(booking.code)}</strong></td>
                  <td><div class="cell-stack"><strong>${esc(booking.farmerName)}</strong><span>${esc(
                    booking.organization || 'Petani mandiri',
                  )}</span></div></td>
                  <td><div class="cell-stack">${esc(unit?.name || '—')}<span>${esc(
                    unit?.region || '',
                  )}</span></div></td>
                  <td>${esc(formatRange(booking.startDate, booking.days))}</td>
                  <td class="mono">${rupiah(booking.totalCost)}</td>
                  <td>${bookingStatusBadge(booking.status)}</td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="grid-3">
      <section class="card card-pad stack">
        <h2 style="font-size:.95rem">Petani terdaftar</h2>
        <div style="font-size:1.5rem;font-weight:800">${farmers.length}</div>
        <p class="text-xs text-muted">Akun petani yang dapat mengajukan sewa.</p>
        <a class="btn btn-outline btn-sm" href="#/admin/pengguna">Kelola pengguna</a>
      </section>
      <section class="card card-pad stack">
        <h2 style="font-size:.95rem">Pesanan berjalan</h2>
        <div style="font-size:1.5rem;font-weight:800">${bookings.filter(
          (b) => b.status === 'in_progress',
        ).length}</div>
        <p class="text-xs text-muted">Tugas lapangan yang sedang dikerjakan operator.</p>
        <a class="btn btn-outline btn-sm" href="#/admin/pesanan">Pantau progres</a>
      </section>
      <section class="card card-pad stack">
        <h2 style="font-size:.95rem">Log BBM terakhir</h2>
        <div style="font-size:1.5rem;font-weight:800">${fuelLogs.length}</div>
        <p class="text-xs text-muted">Catatan konsumsi BBM dan setoran operator.</p>
        <a class="btn btn-outline btn-sm" href="#/admin/laporan">Buka laporan</a>
      </section>
    </div>
  `;

  return {
    title: 'Ringkasan admin',
    html: content,
    bind(root, viewCtx) {
      root.addEventListener('click', async (event) => {
        const btn = event.target.closest('[data-booking-action]');
        if (!btn) return;
        const booking = bookings.find((b) => b.id === btn.dataset.bookingId);
        if (!booking) return;
        const action = btn.dataset.bookingAction;
        btn.disabled = true;
        try {
          await announceStatusChange(booking, action, { bookings });
          await viewCtx.refresh();
        } catch (error) {
          btn.disabled = false;
          console.error(error);
        }
      });
    },
  };
}
