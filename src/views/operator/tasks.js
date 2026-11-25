import { db } from '../../lib/store.js';
import { setBookingStatus } from '../../lib/bookings.js';
import {
  esc,
  formatRange,
  mapsUrlFromCoords,
  rupiah,
  todayISO,
  uid,
} from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { bookingStatusBadge, emptyState, statCard } from '../../ui/kit.js';
import { confirmDialog, openModal, toast } from '../../ui/overlay.js';

export async function render(ctx) {
  const { user } = ctx;
  const [bookings, units, users, fuelLogs] = await Promise.all([
    db.all('bookings'),
    db.all('units'),
    db.all('users'),
    db.all('fuelLogs'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const mine = bookings.filter((b) => b.operatorId === user.id);
  const active = mine
    .filter((b) => ['approved', 'in_progress'].includes(b.status))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const completed = mine.filter((b) => b.status === 'completed');
  const myLogs = fuelLogs.filter((l) => l.operatorId === user.id);
  const liters = myLogs.reduce((sum, log) => sum + (Number(log.liters) || 0), 0);
  const earnings = completed.reduce(
    (sum, booking) => sum + (Number(user.wagePerDay) || 0) * (Number(booking.days) || 1),
    0,
  );

  const taskCard = (booking) => {
    const unit = unitById.get(booking.unitId);
    const farmer = userById.get(booking.farmerId);
    const maps = mapsUrlFromCoords(booking.coords);
    const isRunning = booking.status === 'in_progress';
    return `
      <article class="card card-pad stack">
        <div class="spread">
          <div>
            <div class="row">
              <strong>${esc(booking.code)}</strong>
              ${bookingStatusBadge(booking.status)}
            </div>
            <p class="text-sm text-muted">${esc(unit?.name || 'Unit')} · ${esc(unit?.region || '—')}</p>
          </div>
          <div style="text-align:right">
            <strong>${rupiah((Number(user.wagePerDay) || 0) * (Number(booking.days) || 1))}</strong>
            <div class="text-xs text-muted">estimasi upah ${esc(booking.days)} hari</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box"><span>Petani</span><strong>${esc(booking.farmerName)}</strong></div>
          <div class="meta-box"><span>Jadwal</span><strong>${esc(
            formatRange(booking.startDate, booking.days),
          )}</strong></div>
          <div class="meta-box"><span>Volume</span><strong>${esc(booking.quantity)} ${esc(
            unit?.scheme === 'per_ha' ? 'ha/hari' : unit?.scheme === 'per_hour' ? 'jam/hari' : 'ritase/hari',
          )}</strong></div>
          <div class="meta-box"><span>Skema</span><strong>${
            booking.pricingMode === 'full' ? 'Paket lengkap' : 'Lepas kunci'
          }</strong></div>
        </div>

        <dl class="kv">
          <div class="kv-row"><dt>Lokasi</dt><dd>${esc(booking.location)}</dd></div>
          <div class="kv-row"><dt>Kontak petani</dt><dd>${esc(farmer?.phone || booking.contact || '—')}</dd></div>
          <div class="kv-row"><dt>Catatan</dt><dd>${esc(booking.notes || '—')}</dd></div>
        </dl>

        <div class="row">
          ${
            maps
              ? `<a class="btn btn-outline btn-sm" href="${maps}" target="_blank" rel="noopener noreferrer">Buka lokasi ↗</a>`
              : ''
          }
          ${
            isRunning
              ? `<button type="button" class="btn btn-primary btn-sm" data-task-complete="${esc(
                  booking.id,
                )}">${icon('check', 14)} Tandai selesai</button>`
              : `<button type="button" class="btn btn-primary btn-sm" data-task-start="${esc(
                  booking.id,
                )}">${icon('play', 14)} Mulai pekerjaan</button>`
          }
          <button type="button" class="btn btn-outline btn-sm" data-report-fuel="${esc(
            booking.id,
          )}">Catat BBM</button>
        </div>
      </article>
    `;
  };

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Ruang operator</span>
        <h1>Halo, ${esc(user.name)}</h1>
        <p>${esc(user.region)} · ${esc((user.skills || []).join(', ') || 'Operator lapangan')} — perbarui progres tugas dari sini.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/operator/riwayat">Riwayat &amp; setoran</a>
        <button type="button" class="btn btn-primary" id="quick-report">${icon('fuel', 16)} Catat BBM</button>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Tugas aktif',
        value: active.length,
        hint: active.length ? 'Termasuk yang sedang berjalan' : 'Belum ada penugasan',
        iconName: 'flag',
        accent: true,
      })}
      ${statCard({
        label: 'Selesai',
        value: completed.length,
        hint: 'Total tugas tuntas',
        iconName: 'check',
      })}
      ${statCard({
        label: 'Estimasi upah selesai',
        value: rupiah(earnings),
        hint: `Tarif ${rupiah(user.wagePerDay || 0)}/hari`,
        iconName: 'chart',
      })}
      ${statCard({
        label: 'BBM dilaporkan',
        value: `${liters.toLocaleString('id-ID')} L`,
        hint: `${myLogs.length} catatan`,
        iconName: 'fuel',
      })}
    </div>

    <section class="stack">
      <div class="card-head" style="margin-bottom:0">
        <div><h2>Tugas lapangan</h2><p>Pesanan yang ditugaskan admin KUD kepada Anda.</p></div>
      </div>
      ${
        active.length
          ? `<div class="stack">${active.map(taskCard).join('')}</div>`
          : emptyState({
              title: 'Belum ada tugas aktif',
              description: 'Admin KUD akan menugaskan Anda setelah pesanan petani disetujui.',
              iconName: 'flag',
            })
      }
    </section>
  `;

  return {
    title: 'Tugas saya',
    html: content,
    bind(root, viewCtx) {
      const openFuelForm = (presetBooking) => {
        const options = active.length ? active : mine;
        if (!options.length) {
          toast('Belum ada tugas untuk dilaporkan.', 'error');
          return;
        }
        const defaultBooking = presetBooking || options[0];
        openModal({
          title: 'Catat BBM & hasil kerja',
          subtitle: 'Laporan masuk ke dashboard admin KUD.',
          submitLabel: 'Simpan laporan',
          body: `<div data-modal-error></div>
            <div class="field">
              <label for="f-booking">Tugas terkait</label>
              <select id="f-booking" name="bookingId">
                <option value="">Tanpa tugas khusus</option>
                ${options
                  .map(
                    (booking) =>
                      `<option value="${esc(booking.id)}"${
                        booking.id === defaultBooking.id ? ' selected' : ''
                      }>${esc(booking.code)} — ${esc(unitById.get(booking.unitId)?.name || '')}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="f-date">Tanggal</label>
                <input class="input" id="f-date" name="date" type="date" value="${todayISO()}" required />
              </div>
              <div class="field">
                <label for="f-area">Volume kerja</label>
                <input class="input" id="f-area" name="area" placeholder="Contoh: 2 ha / 4 ritase" />
              </div>
            </div>
            <div class="form-grid-3">
              <div class="field">
                <label for="f-liters">BBM (L)</label>
                <input class="input" id="f-liters" name="liters" type="number" min="0" step="0.1" value="10" required />
              </div>
              <div class="field">
                <label for="f-cost">Biaya BBM (Rp)</label>
                <input class="input" id="f-cost" name="cost" type="number" min="0" step="1000" value="68000" />
              </div>
              <div class="field">
                <label for="f-revenue">Pendapatan (Rp)</label>
                <input class="input" id="f-revenue" name="revenue" type="number" min="0" step="1000" value="0" />
              </div>
            </div>
            <div class="field">
              <label for="f-note">Catatan</label>
              <textarea id="f-note" name="note" rows="2" placeholder="Kendala, cuaca, atau kondisi medan."></textarea>
            </div>
          `,
          onSubmit: async (form) => {
            const data = Object.fromEntries(new FormData(form));
            const booking = options.find((b) => b.id === data.bookingId) || null;
            if (!(Number(data.liters) > 0)) throw new Error('Volume BBM harus lebih dari 0.');
            const unitId = booking ? booking.unitId : unitById.get(units[0]?.id)?.id;
            if (!unitId) throw new Error('Belum ada unit untuk dilaporkan.');
            await db.insert('fuelLogs', {
              id: uid('fl'),
              unitId,
              operatorId: user.id,
              bookingId: booking?.id || null,
              date: data.date,
              liters: Number(data.liters),
              cost: Number(data.cost) || 0,
              revenue: Number(data.revenue) || 0,
              area: String(data.area || '').trim(),
              note: String(data.note || '').trim(),
              createdAt: new Date().toISOString(),
            });
            toast('Laporan BBM tersimpan.');
            await viewCtx.refresh();
          },
        });
      };

      root.querySelector('#quick-report').addEventListener('click', () => openFuelForm(null));

      root.addEventListener('click', async (event) => {
        const startBtn = event.target.closest('[data-task-start]');
        if (startBtn) {
          const booking = mine.find((b) => b.id === startBtn.dataset.taskStart);
          if (!booking) return;
          startBtn.disabled = true;
          try {
            await setBookingStatus(booking, 'in_progress');
            toast(`${booking.code} ditandai sedang berjalan.`);
            await viewCtx.refresh();
          } catch (error) {
            startBtn.disabled = false;
            toast(error.message, 'error');
          }
          return;
        }

        const completeBtn = event.target.closest('[data-task-complete]');
        if (completeBtn) {
          const booking = mine.find((b) => b.id === completeBtn.dataset.taskComplete);
          if (!booking) return;
          confirmDialog({
            title: `Selesaikan ${booking.code}?`,
            message:
              'Pastikan pekerjaan sudah tuntas dan hasil sudah diserahkan ke petani sebelum menandai selesai.',
            confirmLabel: 'Ya, selesaikan',
            tone: 'primary',
            onConfirm: async () => {
              await setBookingStatus(booking, 'completed');
              toast(`${booking.code} selesai.`);
              await viewCtx.refresh();
            },
          });
          return;
        }

        const reportBtn = event.target.closest('[data-report-fuel]');
        if (reportBtn) {
          const booking = mine.find((b) => b.id === reportBtn.dataset.reportFuel);
          openFuelForm(booking || null);
        }
      });
    },
  };
}
