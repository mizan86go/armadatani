import { CATEGORIES, REGION_NAMES, UNIT_STATUS } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { favoriteIdsFor, toggleFavorite } from '../../lib/favorites.js';
import { esc, rupiah } from '../../lib/utils.js';
import { starIcon } from '../../ui/icons.js';
import { badge, emptyState } from '../../ui/kit.js';
import { closeModal, toast } from '../../ui/overlay.js';
import { unitCard } from '../../ui/unitCard.js';
import { openUnitDetail } from './unitDetail.js';

const SORTS = [
  { value: 'default', label: 'Urutan bawaan' },
  { value: 'price_asc', label: 'Tarif terendah' },
  { value: 'price_desc', label: 'Tarif tertinggi' },
  { value: 'capacity_desc', label: 'Kapasitas terbesar' },
];

export async function render(ctx) {
  const { user } = ctx;
  const [units, packages, favIds] = await Promise.all([
    db.all('units'),
    db.all('packages'),
    favoriteIdsFor(user.id),
  ]);

  const state = { query: '', category: 'all', region: 'all', status: 'all', sort: 'default' };

  const applyFilters = () => {
    let rows = units.filter((unit) => {
      if (state.category !== 'all' && unit.category !== state.category) return false;
      if (state.region !== 'all' && unit.region !== state.region) return false;
      if (state.status !== 'all' && unit.status !== state.status) return false;
      if (state.query) {
        const haystack =
          `${unit.name} ${unit.category} ${unit.region} ${unit.description} ${unit.fuelType}`.toLowerCase();
        if (!haystack.includes(state.query.toLowerCase())) return false;
      }
      return true;
    });

    if (state.sort === 'price_asc') rows = [...rows].sort((a, b) => a.baseRate - b.baseRate);
    if (state.sort === 'price_desc') rows = [...rows].sort((a, b) => b.baseRate - a.baseRate);
    if (state.sort === 'capacity_desc') rows = [...rows].sort((a, b) => b.capacity - a.capacity);
    return rows;
  };

  const categoryCounts = CATEGORIES.map((cat) => ({
    cat,
    count: units.filter((u) => u.category === cat).length,
  }));

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Inventaris</span>
        <h1>Katalog alat &amp; armada</h1>
        <p>${units.length} unit terdaftar di ${REGION_NAMES.length} wilayah layanan. Tarif dasar adalah sewa alat saja (lepas kunci).</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/petani/sewa">Kalender ketersediaan</a>
      </div>
    </div>

    <div class="row">
      ${categoryCounts.map((item) => `<span class="chip">${esc(item.cat)} · ${item.count}</span>`).join('')}
    </div>

    <div class="toolbar">
      <div class="field is-search">
        <label for="cat-search">Cari unit / spesifikasi</label>
        <input class="input" id="cat-search" type="search" placeholder="Contoh: traktor, drone, 4x4, kopi" />
      </div>
      <div class="field">
        <label for="cat-category">Kategori</label>
        <select id="cat-category">
          <option value="all">Semua kategori</option>
          ${CATEGORIES.map((cat) => `<option value="${esc(cat)}">${esc(cat)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="cat-region">Wilayah</label>
        <select id="cat-region">
          <option value="all">Semua wilayah</option>
          ${REGION_NAMES.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="cat-status">Status</label>
        <select id="cat-status">
          <option value="all">Semua status</option>
          ${Object.entries(UNIT_STATUS)
            .map(([value, meta]) => `<option value="${value}">${esc(meta.label)}</option>`)
            .join('')}
        </select>
      </div>
      <div class="field">
        <label for="cat-sort">Urutkan</label>
        <select id="cat-sort">
          ${SORTS.map((sort) => `<option value="${sort.value}">${esc(sort.label)}</option>`).join('')}
        </select>
      </div>
      <div class="toolbar-result" id="cat-count"></div>
    </div>

    <div class="grid-auto" id="unit-grid"></div>

    <section class="stack" style="margin-top:1rem">
      <div class="card-head" style="margin-bottom:0">
        <div>
          <h2>Paket layanan KUD</h2>
          <p>Kombinasi alat dan armada untuk pekerjaan yang lebih lengkap.</p>
        </div>
      </div>
      <div class="grid-2">
        ${packages
          .map(
            (pkg) => `
            <article class="card card-pad stack">
              <div class="spread">
                <h3>${esc(pkg.name)}</h3>
                ${badge('Paket', 'primary', true)}
              </div>
              <p class="text-sm text-muted">${esc(pkg.description)}</p>
              <div class="row">
                ${pkg.unitNames.map((name) => `<span class="chip">${esc(name)}</span>`).join('')}
              </div>
              <div class="unit-rates" style="border-top:1px dashed var(--border);padding-top:.5rem">
                <div><span>Estimasi dasar</span><strong>${rupiah(pkg.price)}</strong></div>
                <div class="est"><span>Paket lengkap</span><strong>${rupiah(pkg.fullPrice)}</strong></div>
              </div>
              <p class="text-xs text-muted">Cakupan: ${esc(pkg.scope)}</p>
              <button type="button" class="btn btn-outline btn-sm" data-package-book="${esc(
                pkg.id,
              )}">Ajukan unit pertama</button>
            </article>`,
          )
          .join('')}
      </div>
    </section>
  `;

  return {
    title: 'Katalog alat',
    html: content,
    bind(root) {
      const grid = root.querySelector('#unit-grid');
      const count = root.querySelector('#cat-count');

      const renderGrid = () => {
        const rows = applyFilters();
        count.textContent = `${rows.length} unit ditampilkan`;
        grid.innerHTML = rows.length
          ? rows
              .map((unit) =>
                unitCard(unit, {
                  favorite: favIds.has(unit.id),
                  canBook: unit.status !== 'maintenance',
                }),
              )
              .join('')
          : emptyState({
              title: 'Tidak ada unit yang cocok',
              description: 'Ubah kata kunci atau filter wilayah/kategori untuk melihat unit lain.',
              actionLabel: 'Reset filter',
              actionAttr: 'data-reset-filter',
              iconName: 'search',
            });
      };

      root.querySelector('#cat-search').addEventListener('input', (event) => {
        state.query = event.target.value.trim();
        renderGrid();
      });
      root.querySelector('#cat-category').addEventListener('change', (event) => {
        state.category = event.target.value;
        renderGrid();
      });
      root.querySelector('#cat-region').addEventListener('change', (event) => {
        state.region = event.target.value;
        renderGrid();
      });
      root.querySelector('#cat-status').addEventListener('change', (event) => {
        state.status = event.target.value;
        renderGrid();
      });
      root.querySelector('#cat-sort').addEventListener('change', (event) => {
        state.sort = event.target.value;
        renderGrid();
      });

      grid.addEventListener('click', async (event) => {
        if (event.target.closest('[data-reset-filter]')) {
          Object.assign(state, { query: '', category: 'all', region: 'all', status: 'all', sort: 'default' });
          root.querySelector('#cat-search').value = '';
          root.querySelector('#cat-category').value = 'all';
          root.querySelector('#cat-region').value = 'all';
          root.querySelector('#cat-status').value = 'all';
          root.querySelector('#cat-sort').value = 'default';
          renderGrid();
          return;
        }

        const favBtn = event.target.closest('[data-fav-unit]');
        if (favBtn) {
          const unitId = favBtn.dataset.favUnit;
          const nowFav = await toggleFavorite(user.id, unitId);
          nowFav ? favIds.add(unitId) : favIds.delete(unitId);
          favBtn.classList.toggle('is-active', nowFav);
          favBtn.setAttribute('aria-pressed', String(nowFav));
          favBtn.innerHTML = starIcon(nowFav);
          toast(nowFav ? 'Ditambahkan ke favorit.' : 'Dihapus dari favorit.');
          return;
        }

        const detailBtn = event.target.closest('[data-unit-detail]');
        if (detailBtn) {
          const unit = units.find((u) => u.id === detailBtn.dataset.unitDetail);
          if (unit) {
            openUnitDetail(unit, {
              onBook: (selected) => {
                closeModal();
                ctx.navigate(`/petani/sewa?unit=${selected.id}`);
              },
            });
          }
          return;
        }

        const bookBtn = event.target.closest('[data-unit-book]');
        if (bookBtn) {
          ctx.navigate(`/petani/sewa?unit=${bookBtn.dataset.unitBook}`);
        }
      });

      root.querySelectorAll('[data-package-book]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const pkg = packages.find((p) => p.id === btn.dataset.packageBook);
          const unit = units.find((u) => u.name === pkg?.unitNames[0]);
          ctx.navigate(unit ? `/petani/sewa?unit=${unit.id}` : '/petani/sewa');
        });
      });

      renderGrid();
    },
  };
}
