import {
  MAX_BOOKING_DAYS,
  REGIONS,
  TERRAIN_FACTORS,
  TERRAIN_OPTIONS,
} from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import {
  buildAvailability,
  computeQuote,
  defaultFuelPrice,
  findConflict,
  schemeLabel,
  schemeUnit,
} from '../../lib/domain.js';
import {
  addDaysISO,
  esc,
  formatDateShort,
  formatWeekday,
  mapsUrlFromCoords,
  rupiah,
  sequenceCode,
  todayISO,
  uid,
} from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { alertBox, quoteBox } from '../../ui/kit.js';
import { toast } from '../../ui/overlay.js';

const planDates = () => Array.from({ length: 14 }, (_, i) => addDaysISO(todayISO(), i));

function quantityLabel(scheme) {
  if (scheme === 'per_ha') return 'Luas lahan (ha) per hari';
  if (scheme === 'per_hour') return 'Jam kerja per hari';
  return 'Jumlah ritase per hari';
}

export async function render(ctx) {
  const { user } = ctx;
  const [units, users, bookings] = await Promise.all([
    db.all('units'),
    db.all('users'),
    db.all('bookings'),
  ]);

  const operators = users.filter((u) => u.role === 'operator' && u.status === 'active');
  const bookable = units.filter((u) => u.status !== 'maintenance');
  const dates = planDates();
  const availability = buildAvailability(units, bookings, dates);

  const requestedUnitId = ctx.query.get('unit');
  const initialUnit =
    bookable.find((u) => u.id === requestedUnitId) || bookable[0] || units[0];
  const initialQuote = computeQuote(initialUnit, {
    days: 1,
    quantity: 1,
    mode: 'full',
    terrainFactor: TERRAIN_FACTORS[initialUnit.terrains[0]] || 1,
    fuelPrice: defaultFuelPrice(initialUnit),
    operatorWage: 0,
  });

  const regionMeta = REGIONS.find((r) => r.name === user.region) || REGIONS[0];
  const defaultCoords = `${regionMeta.lat},${regionMeta.lng}`;

  const matrix = `
    <table class="cal-table">
      <thead>
        <tr>
          <th class="unit-col-head">Unit</th>
          ${dates
            .map(
              (date) =>
                `<th title="${esc(date)}">${esc(formatWeekday(date))}<br>${esc(formatDateShort(date))}</th>`,
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${availability
          .map(
            ({ unit, cells }) => `
            <tr>
              <td class="unit-col">${esc(unit.name)}<span>${esc(unit.region)}</span></td>
              ${cells
                .map((cell, index) =>
                  cell.type === 'free'
                    ? `<td><button type="button" class="slot slot-free" data-slot-unit="${esc(
                        unit.id,
                      )}" data-slot-date="${esc(dates[index])}" title="Kosong — klik untuk memilih">•</button></td>`
                    : `<td><span class="slot slot-${cell.type}" title="${esc(
                        cell.type === 'booked' ? `Dipesan ${cell.label}` : 'Unit sedang servis',
                      )}">${cell.type === 'booked' ? esc(cell.label) : 'Servis'}</span></td>`,
                )
                .join('')}
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Penjadwalan</span>
        <h1>Ajukan sewa alat</h1>
        <p>Isi formulir di bawah. Sistem menolak unit atau operator yang sudah punya jadwal aktif pada tanggal yang sama.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-outline" href="#/petani/pesanan">Pesanan saya</a>
      </div>
    </div>

    <section class="card card-pad stack">
      <div class="card-head" style="margin-bottom:0">
        <div>
          <h2>Ketersediaan 14 hari ke depan</h2>
          <p>Klik sel hijau untuk mengisi unit dan tanggal mulai secara otomatis.</p>
        </div>
        <div class="legend">
          <span class="badge badge-success">Kosong</span>
          <span class="badge badge-warning">Terjadwal</span>
          <span class="badge badge-danger">Servis</span>
        </div>
      </div>
      <div class="cal-wrap">${matrix}</div>
    </section>

    <div class="grid-2" style="align-items:start">
      <section class="card card-pad">
        <div class="card-head">
          <div>
            <h2>Formulir pemesanan</h2>
            <p>Semua perhitungan memakai tarif unit dan harga BBM yang berlaku.</p>
          </div>
        </div>

        <form id="booking-form" class="stack" novalidate>
          <div id="booking-alert"></div>

          <div class="field">
            <label for="bk-unit">Unit alsintan / armada</label>
            <select id="bk-unit" name="unitId" required>
              ${units
                .map(
                  (unit) =>
                    `<option value="${esc(unit.id)}"${
                      unit.id === initialUnit.id ? ' selected' : ''
                    }${unit.status === 'maintenance' ? ' disabled' : ''}>${esc(unit.name)} — ${esc(
                      unit.region,
                    )} · ${rupiah(unit.baseRate)} ${esc(schemeLabel(unit.scheme))}${
                      unit.status === 'maintenance' ? ' (servis)' : ''
                    }</option>`,
                )
                .join('')}
            </select>
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="bk-mode">Skema tarif</label>
              <select id="bk-mode" name="pricingMode">
                <option value="full" selected>Paket lengkap (BBM + operator)</option>
                <option value="base">Lepas kunci (alat saja)</option>
              </select>
            </div>
            <div class="field">
              <label for="bk-operator">Operator / sopir</label>
              <select id="bk-operator" name="operatorId">
                <option value="">Lepas kunci — tanpa operator</option>
                ${operators
                  .map(
                    (op) =>
                      `<option value="${esc(op.id)}">${esc(op.name)} — ${esc(
                        op.region,
                      )} · ${rupiah(op.wagePerDay)}/hari</option>`,
                  )
                  .join('')}
              </select>
              <span class="field-hint">Operator dengan jadwal bentrok akan ditolak sistem.</span>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="field">
              <label for="bk-start">Tanggal mulai</label>
              <input class="input" id="bk-start" name="startDate" type="date" min="${todayISO()}" value="${addDaysISO(
                todayISO(),
                1,
              )}" required />
            </div>
            <div class="field">
              <label for="bk-days">Durasi (hari)</label>
              <select id="bk-days" name="days">
                ${Array.from({ length: MAX_BOOKING_DAYS }, (_, i) => i + 1)
                  .map((n) => `<option value="${n}">${n} hari</option>`)
                  .join('')}
              </select>
            </div>
            <div class="field">
              <label for="bk-qty" id="qty-label">${esc(quantityLabel(initialUnit.scheme))}</label>
              <input class="input" id="bk-qty" name="quantity" type="number" min="0.5" step="0.5" value="1" required />
            </div>
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="bk-terrain">Kondisi medan</label>
              <select id="bk-terrain" name="terrain">
                ${TERRAIN_OPTIONS.map(
                  (terrain) =>
                    `<option value="${esc(terrain)}"${
                      terrain === initialUnit.terrains[0] ? ' selected' : ''
                    }>${esc(terrain)}</option>`,
                ).join('')}
              </select>
              <span class="field-hint">Faktor BBM: ${TERRAIN_OPTIONS.map(
                (t) => `${t} ${TERRAIN_FACTORS[t]}×`,
              ).join(' · ')}</span>
            </div>
            <div class="field">
              <label for="bk-fuel">Harga BBM (Rp/liter)</label>
              <input class="input" id="bk-fuel" name="fuelPrice" type="number" min="1000" step="100" value="${defaultFuelPrice(
                initialUnit,
              )}" required />
            </div>
          </div>

          <div class="field">
            <label for="bk-location">Lokasi lahan / desa</label>
            <input class="input" id="bk-location" name="location" type="text" placeholder="Contoh: Sawah Blok Barat, Indrapuri" value="${esc(
              user.region,
            )}" required />
          </div>

          <div class="field">
            <label for="bk-coords">Koordinat lahan (lat,lng)</label>
            <div class="input-group">
              <input class="input" id="bk-coords" name="coords" type="text" value="${defaultCoords}" placeholder="5.5483,95.3238" />
              <a class="btn btn-outline" id="maps-link" href="${mapsUrlFromCoords(defaultCoords)}" target="_blank" rel="noopener noreferrer">
                Peta ↗
              </a>
            </div>
            <span class="field-hint">Opsional. Dipakai admin dan operator untuk membuka lokasi via Google Maps.</span>
          </div>

          <div class="field">
            <label for="bk-notes">Catatan untuk operator</label>
            <textarea id="bk-notes" name="notes" rows="2" placeholder="Contoh: prioritaskan blok timur, akses jalan sempit."></textarea>
          </div>

          <div id="quote-box">${quoteBox(initialQuote, initialUnit, 0)}</div>

          <button type="submit" class="btn btn-primary btn-lg btn-block">
            ${icon('check', 16)} Kirim pengajuan sewa
          </button>
        </form>
      </section>

      <aside class="stack">
        <section class="card card-pad stack">
          <h2>Bagaimana jadwal dikunci</h2>
          <div class="list">
            <div class="list-item">
              <span class="stat-icon">${icon('calendar', 15)}</span>
              <span class="list-item-main"><strong>1. Pilih tanggal</strong><span>Durasi 1–7 hari per pengajuan.</span></span>
            </div>
            <div class="list-item">
              <span class="stat-icon">${icon('shield', 15)}</span>
              <span class="list-item-main"><strong>2. Validasi otomatis</strong><span>Unit dan operator dicek terhadap pesanan menunggu, disetujui, dan berjalan.</span></span>
            </div>
            <div class="list-item">
              <span class="stat-icon">${icon('users', 15)}</span>
              <span class="list-item-main"><strong>3. Verifikasi admin KUD</strong><span>Admin dapat menyetujui, menolak, atau menugaskan operator.</span></span>
            </div>
          </div>
        </section>

        <section class="card card-pad stack">
          <h2>Catatan biaya</h2>
          <dl class="kv">
            <div class="kv-row"><dt>Tarif dasar</dt><dd>Alat saja, tanpa BBM &amp; operator</dd></div>
            <div class="kv-row"><dt>Paket lengkap</dt><dd>Termasuk BBM + upah operator</dd></div>
            <div class="kv-row"><dt>Harga BBM</dt><dd>Dapat disesuaikan</dd></div>
            <div class="kv-row"><dt>Pembulatan</dt><dd>Ke ribuan terdekat</dd></div>
          </dl>
          <p class="text-xs text-muted">Angka final ditetapkan admin KUD saat verifikasi, termasuk biaya mobilisasi bila ada.</p>
        </section>
      </aside>
    </div>
  `;

  return {
    title: 'Ajukan sewa',
    html: content,
    bind(root) {
      const form = root.querySelector('#booking-form');
      const alertSlot = form.querySelector('#booking-alert');
      const quoteSlot = form.querySelector('#quote-box');
      const unitSelect = form.querySelector('[name="unitId"]');
      const operatorSelect = form.querySelector('[name="operatorId"]');
      const fuelInput = form.querySelector('[name="fuelPrice"]');
      const coordsInput = form.querySelector('[name="coords"]');
      const mapsLink = root.querySelector('#maps-link');
      const qtyLabel = root.querySelector('#qty-label');

      const unitById = new Map(units.map((u) => [u.id, u]));
      const userById = new Map(users.map((u) => [u.id, u]));

      const readQuote = () => {
        const unit = unitById.get(unitSelect.value) || initialUnit;
        const operator = userById.get(operatorSelect.value);
        const quantity = Number(form.elements.quantity.value) || 1;
        const quote = computeQuote(unit, {
          days: Number(form.elements.days.value) || 1,
          quantity,
          mode: form.elements.pricingMode.value,
          terrainFactor: TERRAIN_FACTORS[form.elements.terrain.value] || 1,
          fuelPrice: Number(fuelInput.value) || defaultFuelPrice(unit),
          operatorWage: operator?.wagePerDay || 0,
        });
        return { unit, operator, quote };
      };

      const refresh = () => {
        const { unit, operator, quote } = readQuote();
        qtyLabel.textContent = quantityLabel(unit.scheme);
        quoteSlot.innerHTML = quoteBox(quote, unit, operator?.wagePerDay || 0);
        const url = mapsUrlFromCoords(coordsInput.value);
        mapsLink.href = url || '#';
        mapsLink.classList.toggle('hidden', !url);
        mapsLink.setAttribute('aria-disabled', String(!url));
      };

      unitSelect.addEventListener('change', () => {
        const unit = unitById.get(unitSelect.value);
        if (!unit) return;
        fuelInput.value = defaultFuelPrice(unit);
        const terrainSelect = form.elements.terrain;
        if (!unit.terrains.includes(terrainSelect.value)) {
          terrainSelect.value = unit.terrains[0];
        }
        refresh();
      });

      form.addEventListener('input', refresh);
      form.addEventListener('change', refresh);

      root.addEventListener('click', (event) => {
        const slot = event.target.closest('[data-slot-unit]');
        if (!slot) return;
        unitSelect.value = slot.dataset.slotUnit;
        form.elements.startDate.value = slot.dataset.slotDate;
        form.elements.startDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
        refresh();
        toast('Tanggal dan unit terisi dari kalender.');
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        alertSlot.innerHTML = '';

        const unit = unitById.get(unitSelect.value);
        const operatorId = operatorSelect.value || null;
        const operator = operatorId ? userById.get(operatorId) : null;
        const startDate = form.elements.startDate.value;
        const days = Number(form.elements.days.value);
        const location = form.elements.location.value.trim();
        const coords = coordsInput.value.trim();
        const notes = form.elements.notes.value.trim();
        const pricingMode = form.elements.pricingMode.value;

        const fail = (message) => {
          alertSlot.innerHTML = alertBox('warning', esc(message));
          alertSlot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };

        if (!unit) return fail('Pilih unit yang ingin disewa.');
        if (unit.status === 'maintenance') return fail(`Unit ${unit.name} sedang diservis.`);
        if (!startDate || startDate < todayISO()) return fail('Tanggal mulai tidak boleh di masa lalu.');
        if (!location) return fail('Lokasi lahan wajib diisi.');
        if (coords && !mapsUrlFromCoords(coords)) {
          return fail('Format koordinat tidak valid. Gunakan format "lat,lng", contoh 5.5483,95.3238.');
        }
        if (pricingMode === 'full' && !operatorId) {
          return fail(
            'Paket lengkap membutuhkan operator. Pilih operator, atau ubah skema menjadi lepas kunci.',
          );
        }

        const conflict = findConflict(bookings, {
          unitId: unit.id,
          operatorId,
          startDate,
          days,
        });
        if (!conflict.ok) return fail(conflict.message);

        const { quote } = readQuote();
        const now = new Date().toISOString();
        const booking = {
          id: uid('bk'),
          code: sequenceCode('BK', bookings),
          farmerId: user.id,
          farmerName: user.name,
          contact: user.phone || '',
          organization: user.organization || '',
          unitId: unit.id,
          operatorId,
          startDate,
          days,
          quantity: Number(form.elements.quantity.value) || 1,
          pricingMode,
          terrain: form.elements.terrain.value,
          location,
          coords,
          totalCost: quote.total,
          status: 'pending',
          notes,
          createdAt: now,
          updatedAt: now,
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim…';

        try {
          await db.insert('bookings', booking);
          toast(`Pengajuan ${booking.code} terkirim. Menunggu verifikasi admin KUD.`);
          ctx.navigate('/petani/pesanan');
        } catch (error) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `${icon('check', 16)} Kirim pengajuan sewa`;
          fail(error.message || 'Gagal menyimpan pengajuan.');
        }
      });

      refresh();
    },
  };
}
