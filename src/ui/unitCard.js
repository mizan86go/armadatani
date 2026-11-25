import { formatCapacity, computeQuote, schemeLabel, serviceProgress, unitStatusMeta } from '../lib/domain.js';
import { esc, rupiah } from '../lib/utils.js';
import { unitImages } from '../data/images.js';
import { icon, starIcon } from './icons.js';
import { badge } from './kit.js';

export function unitCard(unit, { favorite = false, canFavorite = true, canBook = true } = {}) {
  const quoteFull = computeQuote(unit, { days: 1, quantity: 1, mode: 'full', operatorWage: 180000 });
  const service = serviceProgress(unit);
  const statusMeta = unitStatusMeta(unit.status);
  const images = unitImages(unit);
  const cover = images[0];

  return `
    <article class="card unit-card">
      <div class="unit-photo">
        ${
          cover
            ? `<img src="${esc(cover.src)}" alt="${esc(cover.alt)}" width="900" height="600" loading="lazy" decoding="async" />`
            : `<div class="unit-photo-empty">${icon('truck', 34)}</div>`
        }
        <div class="unit-photo-top">${badge(statusMeta.label, statusMeta.tone)}</div>
        ${
          canFavorite
            ? `<button type="button" class="fav-btn${favorite ? ' is-active' : ''}" data-fav-unit="${esc(
                unit.id,
              )}" aria-pressed="${favorite}" aria-label="Simpan ${esc(unit.name)} ke favorit">${starIcon(
                favorite,
              )}</button>`
            : ''
        }
        ${
          images.length > 1
            ? `<span class="unit-photo-count">${icon('grid', 11)} ${images.length} foto</span>`
            : ''
        }
      </div>
      <div class="unit-body">
        <div>
          <h3 class="unit-title">${esc(unit.name)}</h3>
          <div class="unit-sub">
            ${icon('pin', 13)} ${esc(unit.region)}
            <span aria-hidden="true">·</span>
            ${esc(formatCapacity(unit))}
          </div>
        </div>

        <div class="unit-specs">
          <div><span>BBM</span>${esc(unit.fuelType)} · ${esc(unit.fuelRate)} L/${esc(
            unit.scheme === 'per_ha' ? 'ha' : unit.scheme === 'per_hour' ? 'jam' : 'ritase',
          )}</div>
          <div><span>Syarat</span>${esc(unit.minOrder)}</div>
          <div><span>Servis</span>${service}% dari ${esc(unit.nextServiceAt.toLocaleString('id-ID'))} jam</div>
          <div><span>Kategori</span>${esc(unit.category.replace('Armada Angkut Hasil Kebun', 'Armada angkut'))}</div>
        </div>

        <div class="unit-rates">
          <div>
            <span>Tarif dasar ${esc(schemeLabel(unit.scheme))}</span>
            <strong>${rupiah(unit.baseRate)}</strong>
          </div>
          <div class="est">
            <span>Est. paket lengkap</span>
            <strong>${rupiah(quoteFull.total)}</strong>
          </div>
        </div>

        <div class="unit-actions">
          <button type="button" class="btn btn-outline btn-sm" data-unit-detail="${esc(unit.id)}">Detail &amp; foto</button>
          ${
            canBook
              ? `<button type="button" class="btn btn-primary btn-sm" data-unit-book="${esc(unit.id)}">Sewa</button>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}
