import { db } from '../../lib/store.js';
import { esc, formatDate, formatRange, rupiah } from '../../lib/utils.js';
import { bookingStatusBadge, emptyState, statCard } from '../../ui/kit.js';

export async function render(ctx) {
  const { user } = ctx;
  const [bookings, units, fuelLogs, users] = await Promise.all([
    db.all('bookings'),
    db.all('units'),
    db.all('fuelLogs'),
    db.all('users'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const mine = bookings
    .filter((b) => b.operatorId === user.id)
    .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const completed = mine.filter((b) => b.status === 'completed');
  const totalWage = completed.reduce(
    (sum, b) => sum + (Number(user.wagePerDay) || 0) * (Number(b.days) || 1),
    0,
  );
  const logs = fuelLogs
    .filter((log) => log.operatorId === user.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const totalLiters = logs.reduce((sum, log) => sum + (Number(log.liters) || 0), 0);

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Rekap pribadi</span>
        <h1>Riwayat &amp; setoran</h1>
        <p>Semua tugas yang pernah ditugaskan kepada Anda beserta laporan BBM.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/operator">Kembali ke tugas</a>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Total tugas',
        value: mine.length,
        hint: `${activeCount(mine)} masih aktif`,
        iconName: 'flag',
        accent: true,
      })}
      ${statCard({
        label: 'Selesai',
        value: completed.length,
        hint: 'Sudah diverifikasi selesai',
        iconName: 'check',
      })}
      ${statCard({
        label: 'Estimasi upah',
        value: rupiah(totalWage),
        hint: `Tarif ${rupiah(user.wagePerDay || 0)}/hari`,
        iconName: 'chart',
      })}
      ${statCard({
        label: 'BBM dilaporkan',
        value: `${totalLiters.toLocaleString('id-ID')} L`,
        hint: `${logs.length} catatan`,
        iconName: 'fuel',
      })}
    </div>

    <section class="card card-pad">
      <div class="card-head">
        <div><h2>Penugasan</h2><p>Termasuk tugas aktif dan yang sudah selesai.</p></div>
      </div>
      ${
        mine.length
          ? `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Kode</th><th>Unit</th><th>Petani</th><th>Jadwal</th><th>Upah estimasi</th><th>Status</th></tr>
                </thead>
                <tbody>
                  ${mine
                    .map((booking) => {
                      const unit = unitById.get(booking.unitId);
                      const farmer = userById.get(booking.farmerId);
                      return `<tr>
                        <td><strong>${esc(booking.code)}</strong></td>
                        <td><div class="cell-stack">${esc(unit?.name || '—')}<span>${esc(
                          unit?.region || '',
                        )}</span></div></td>
                        <td>${esc(farmer?.name || booking.farmerName)}</td>
                        <td>${esc(formatRange(booking.startDate, booking.days))}</td>
                        <td class="mono">${rupiah(
                          (Number(user.wagePerDay) || 0) * (Number(booking.days) || 1),
                        )}</td>
                        <td>${bookingStatusBadge(booking.status)}</td>
                      </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`
          : emptyState({
              title: 'Belum ada riwayat penugasan',
              description: 'Tugas akan muncul di sini setelah admin KUD menugaskan Anda.',
              iconName: 'clipboard',
            })
      }
    </section>

    <section class="card card-pad">
      <div class="card-head">
        <div><h2>Laporan BBM</h2><p>Catatan yang Anda kirimkan dari lapangan.</p></div>
      </div>
      ${
        logs.length
          ? `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Tanggal</th><th>Unit</th><th>Volume kerja</th><th>BBM</th><th>Biaya</th><th>Pendapatan</th></tr>
                </thead>
                <tbody>
                  ${logs
                    .map(
                      (log) => `<tr>
                        <td>${esc(formatDate(log.date))}</td>
                        <td>${esc(unitById.get(log.unitId)?.name || '—')}</td>
                        <td>${esc(log.area || '—')}</td>
                        <td class="mono">${esc(log.liters)} L</td>
                        <td class="mono">${rupiah(log.cost)}</td>
                        <td class="mono">${rupiah(log.revenue)}</td>
                      </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : emptyState({
              title: 'Belum ada laporan BBM',
              description: 'Gunakan tombol “Catat BBM” pada halaman tugas untuk menambah laporan.',
              iconName: 'fuel',
            })
      }
    </section>
  `;

  return { title: 'Riwayat & setoran', html: content };
}

function activeCount(bookings) {
  return bookings.filter((b) => ['approved', 'in_progress'].includes(b.status)).length;
}
