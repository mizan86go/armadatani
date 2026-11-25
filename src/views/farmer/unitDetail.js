import { computeQuote, formatCapacity, schemeLabel, serviceProgress } from '../../lib/domain.js';
import { esc, mapsUrlFromCoords, rupiah } from '../../lib/utils.js';
import { unitImages } from '../../data/images.js';
import { photoGallery } from '../../ui/gallery.js';
import { badge, progressBar, unitStatusBadge } from '../../ui/kit.js';
import { openModal } from '../../ui/overlay.js';

/** Shared read-only equipment detail modal for the farmer area. */
export function openUnitDetail(unit, { onBook } = {}) {
  const quoteBase = computeQuote(unit, { days: 1, quantity: 1, mode: 'base' });
  const quoteFull = computeQuote(unit, {
    days: 1,
    quantity: 1,
    mode: 'full',
    operatorWage: 180000,
  });
  const regionCoords = unit.region === 'Aceh Tengah' ? '4.6285,96.8427' : '5.4567,95.4785';
  const mapsUrl = mapsUrlFromCoords(regionCoords);
  const service = serviceProgress(unit);
  const bookable = unit.status !== 'maintenance';
  const images = unitImages(unit);

  const body = `
    ${photoGallery(images, { className: 'is-detail' })}

    <div class="row" style="align-items:flex-start;gap:.8rem">
      <div style="flex:1 1 260px">
        <div class="row" style="margin-bottom:.4rem">
          ${unitStatusBadge(unit.status)}
          ${badge(unit.category, 'neutral', true)}
        </div>
        <p class="text-sm text-muted">${esc(unit.description)}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box"><span>Kapasitas</span><strong>${esc(formatCapacity(unit))}</strong></div>
      <div class="meta-box"><span>Wilayah</span><strong>${esc(unit.region)}</strong></div>
      <div class="meta-box"><span>BBM</span><strong>${esc(unit.fuelType)}</strong></div>
      <div class="meta-box"><span>Konsumsi</span><strong>${esc(unit.fuelRate)} L/${esc(
        unit.scheme === 'per_ha' ? 'ha' : unit.scheme === 'per_hour' ? 'jam' : 'ritase',
      )}</strong></div>
      <div class="meta-box"><span>Tangki</span><strong>${esc(unit.tankCapacity)} L</strong></div>
      <div class="meta-box"><span>Syarat sewa</span><strong>${esc(unit.minOrder)}</strong></div>
    </div>

    <div>
      <div class="spread" style="margin-bottom:.3rem">
        <span class="field-label">Kesiapan servis</span>
        <span class="text-xs text-muted">${service}% dari ${esc(
          unit.nextServiceAt.toLocaleString('id-ID'),
        )} jam</span>
      </div>
      ${progressBar(service)}
    </div>

    <div class="grid-2">
      <div class="card card-pad" style="box-shadow:none">
        <span class="field-label">Tarif dasar</span>
        <div style="font-size:1.15rem;font-weight:800;color:var(--forest-800)">${rupiah(
          unit.baseRate,
        )}</div>
        <p class="text-xs text-muted">${esc(schemeLabel(unit.scheme))} — alat saja (lepas kunci)</p>
        <p class="text-xs text-muted" style="margin-top:.35rem">Contoh 1 hari: ${rupiah(quoteBase.total)}</p>
      </div>
      <div class="card card-pad" style="box-shadow:none">
        <span class="field-label">Estimasi paket lengkap</span>
        <div style="font-size:1.15rem;font-weight:800;color:var(--amber-600)">${rupiah(
          quoteFull.total,
        )}</div>
        <p class="text-xs text-muted">Termasuk BBM ± ${esc(quoteFull.liters)} L dan upah operator</p>
        <p class="text-xs text-muted" style="margin-top:.35rem">1 hari, medan datar</p>
      </div>
    </div>

    <div class="row">
      <span class="chip">Medan: ${esc(unit.terrains.join(', '))}</span>
      <a class="btn btn-outline btn-sm" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
        Buka peta wilayah ↗
      </a>
    </div>

    <div data-modal-error></div>
  `;

  openModal({
    title: unit.name,
    subtitle: `Kode unit ${unit.id} · ${unit.region}`,
    body,
    wide: true,
    footer: `<button type="button" class="btn btn-outline" data-modal-close>Tutup</button>
      ${
        bookable
          ? `<button type="button" class="btn btn-primary" id="detail-book">Ajukan sewa unit ini</button>`
          : `<span class="badge badge-danger">Unit sedang diservis</span>`
      }`,
    onMount: (root) => {
      root.querySelector('#detail-book')?.addEventListener('click', () => {
        onBook?.(unit);
      });
    },
  });
}
