import { ACTIVE_BOOKING_STATUSES } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { favoriteIdsFor, toggleFavorite } from '../../lib/favorites.js';
import { bookingEndDate, bookingStatusMeta, computeQuote } from '../../lib/domain.js';
import { esc, formatRange, rupiah, todayISO } from '../../lib/utils.js';
import { icon, starIcon } from '../../ui/icons.js';
import { emptyState, statCard } from '../../ui/kit.js';
import { toast } from '../../ui/overlay.js';
import { unitCard } from '../../ui/unitCard.js';
import { openUnitDetail } from './unitDetail.js';
import { closeModal } from '../../ui/overlay.js';

export async function render(ctx) {
  const { user } = ctx;
  const [bookings, units, favIds] = await Promise.all([
    db.all('bookings'),
    db.all('units'),
    favoriteIdsFor(user.id),
  ]);

  const mine = bookings.filter((b) => b.farmerId === user.id);
  const active = mine.filter((b) => ACTIVE_BOOKING_STATUSES.includes(b.status));
  const pending = mine.filter((b) => b.status === 'pending');
  const completed = mine.filter((b) => b.status === 'completed');
  const unitById = new Map(units.map((u) => [u.id, u]));

  const upcoming = [...active].sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
    return a.startDate.localeCompare(b.startDate);
  })[0];

  const upcomingUnit = upcoming ? unitById.get(upcoming.unitId) : null;
  const regionUnits = units.filter((u) => u.region === user.region && u.status !== 'maintenance');
  const recommended = (regionUnits.length ? regionUnits : units.filter((u) => u.status !== 'maintenance')).slice(
    0,
    3,
  );

  const activeSpend = active.reduce((sum, b) => sum + (Number(b.totalCost) || 0), 0);

  const upcomingCard = upcoming
    ? `
      <section class="card card-pad stack">
        <div class="card-head" style="margin-bottom:0">
          <div>
            <h2>Jadwal terdekat</h2>
            <p>${esc(upcoming.code)} · ${esc(upcomingUnit?.name || 'Unit')}</p>
          </div>
          ${(() => {
            const meta = bookingStatusMeta(upcoming.status);
            return `<span class="badge badge-${meta.tone}">${esc(meta.label)}</span>`;
          })()}
        </div>
        <dl class="kv">
          <div class="kv-row"><dt>Tanggal</dt><dd>${esc(formatRange(upcoming.startDate, upcoming.days))}</dd></div>
          <div class="kv-row"><dt>Durasi</dt><dd>${esc(upcoming.days)} hari</dd></div>
          <div class="kv-row"><dt>Lokasi</dt><dd>${esc(upcoming.location)}</dd></div>
          <div class="kv-row"><dt>Skema</dt><dd>${upcoming.pricingMode === 'full' ? 'Paket lengkap' : 'Lepas kunci'}</dd></div>
          <div class="kv-row"><dt>Estimasi biaya</dt><dd>${rupiah(upcoming.totalCost)}</dd></div>
        </dl>
        <div class="row">
          <a class="btn btn-primary btn-sm" href="#/petani/pesanan">Lihat pesanan</a>
          <a class="btn btn-outline btn-sm" href="#/petani/sewa">Ajukan sewa lagi</a>
        </div>
      </section>`
    : `<section class="card card-pad">
        <div class="card-head"><div><h2>Jadwal terdekat</h2><p>Belum ada sewa yang aktif.</p></div></div>
        ${emptyState({
          title: 'Siap mulai musim ini?',
          description: 'Ajukan sewa alat atau armada angkut, lalu pantau persetujuan admin KUD di halaman pesanan.',
          actionLabel: 'Ajukan sewa',
          actionAttr: 'data-nav="/petani/sewa"',
          iconName: 'calendar',
        })}
      </section>`;

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Ruang petani</span>
        <h1>Halo, ${esc(user.name)}</h1>
        <p>${esc(user.organization || 'Petani mandiri')} · ${esc(user.region)} — ringkasan aktivitas sewa Anda.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/petani/katalog">Katalog alat</a>
        <a class="btn btn-primary" href="#/petani/sewa">${icon('plus', 16)} Ajukan sewa</a>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Pesanan aktif',
        value: active.length,
        hint: activeSpend ? `Nilai ${rupiah(activeSpend)}` : 'Belum ada nilai kontrak aktif',
        iconName: 'calendar',
        accent: true,
      })}
      ${statCard({
        label: 'Menunggu konfirmasi',
        value: pending.length,
        hint: pending.length ? 'Menunggu verifikasi admin KUD' : 'Semua sudah diproses',
        iconName: 'clock',
      })}
      ${statCard({
        label: 'Selesai',
        value: completed.length,
        hint: 'Riwayat pekerjaan tuntas',
        iconName: 'check',
      })}
      ${statCard({
        label: 'Unit favorit',
        value: favIds.size,
        hint: 'Tersimpan di perangkat ini',
        iconName: 'star',
      })}
    </div>

    <div class="grid-2">
      ${upcomingCard}

      <section class="card card-pad stack">
        <div class="card-head" style="margin-bottom:0">
          <div><h2>Aksi cepat</h2><p>Alur singkat dari memilih alat sampai jadwal dikonfirmasi.</p></div>
        </div>
        <a class="list-item" href="#/petani/katalog">
          <span class="stat-icon">${icon('grid', 15)}</span>
          <span class="list-item-main">
            <strong>Cari alat sesuai kebutuhan</strong>
            <span>Filter kategori, wilayah, dan status ketersediaan.</span>
          </span>
          ${icon('arrowRight', 16)}
        </a>
        <a class="list-item" href="#/petani/sewa">
          <span class="stat-icon">${icon('calendar', 15)}</span>
          <span class="list-item-main">
            <strong>Ajukan jadwal sewa</strong>
            <span>Kalender 14 hari menolak jadwal yang bertabrakan.</span>
          </span>
          ${icon('arrowRight', 16)}
        </a>
        <a class="list-item" href="#/petani/pesanan">
          <span class="stat-icon">${icon('clipboard', 15)}</span>
          <span class="list-item-main">
            <strong>Pantau status pesanan</strong>
            <span>Lihat persetujuan, pembatalan, dan riwayat.</span>
          </span>
          ${icon('arrowRight', 16)}
        </a>
        <div class="alert alert-info">
          ${icon('shield', 16)}
          <div>Estimasi biaya bersifat indikatif. Angka final bergantung pada kondisi medan, cuaca, dan akses jalan di lapangan.</div>
        </div>
      </section>
    </div>

    <section class="stack">
      <div class="card-head" style="margin-bottom:0">
        <div>
          <h2>Rekomendasi alat di ${esc(user.region)}</h2>
          <p>Unit tersedia yang sesuai wilayah layanan Anda.</p>
        </div>
        <a class="btn btn-outline btn-sm" href="#/petani/katalog">Lihat semua ${units.length} unit</a>
      </div>
      <div class="grid-auto">
        ${recommended
          .map((unit) =>
            unitCard(unit, { favorite: favIds.has(unit.id), canBook: unit.status !== 'maintenance' }),
          )
          .join('')}
      </div>
    </section>
  `;

  return {
    title: 'Ringkasan petani',
    html: content,
    bind(root) {
      root.addEventListener('click', async (event) => {
        const favBtn = event.target.closest('[data-fav-unit]');
        if (favBtn) {
          const unitId = favBtn.dataset.favUnit;
          const active2 = await toggleFavorite(user.id, unitId);
          active2 ? favIds.add(unitId) : favIds.delete(unitId);
          root.querySelectorAll(`[data-fav-unit="${unitId}"]`).forEach((btn) => {
            btn.classList.toggle('is-active', active2);
            btn.setAttribute('aria-pressed', String(active2));
            btn.innerHTML = starIcon(active2);
          });
          toast(active2 ? 'Ditambahkan ke favorit.' : 'Dihapus dari favorit.');
          return;
        }

        const detailBtn = event.target.closest('[data-unit-detail]');
        if (detailBtn) {
          const unit = units.find((u) => u.id === detailBtn.dataset.unitDetail);
          if (unit) openUnitDetail(unit, { onBook: (u) => { closeModal(); ctx.navigate(`/petani/sewa?unit=${u.id}`); } });
          return;
        }

        const bookBtn = event.target.closest('[data-unit-book]');
        if (bookBtn) {
          ctx.navigate(`/petani/sewa?unit=${bookBtn.dataset.unitBook}`);
        }
      });
    },
  };
}
