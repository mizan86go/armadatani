import {
  CATEGORIES,
  REGION_NAMES,
  UNIT_ICONS,
  UNIT_SCHEMES,
  UNIT_STATUS,
  UNIT_STATUS_OPTIONS,
} from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { formatCapacity, schemeLabel, serviceProgress } from '../../lib/domain.js';
import { esc, rupiah, todayISO, uid } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { progressBar, unitStatusBadge } from '../../ui/kit.js';
import { confirmDialog, openModal, toast } from '../../ui/overlay.js';

function terrainCheckboxes(selected) {
  return ['Datar', 'Bergelombang', 'Berbukit', 'Berlumpur']
    .map(
      (terrain) => `<label class="check" style="font-size:.8rem">
        <input type="checkbox" name="terrains" value="${terrain}"${
          selected.includes(terrain) ? ' checked' : ''
        } /> <span>${terrain}</span>
      </label>`,
    )
    .join('');
}

function unitFormBody(unit) {
  const isEdit = Boolean(unit);
  const value = (key, fallback = '') => esc(unit?.[key] ?? fallback);
  return `<div data-modal-error></div>
    <div class="field">
      <label for="u-name">Nama unit</label>
      <input class="input" id="u-name" name="name" value="${value('name')}" required />
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="u-category">Kategori</label>
        <select id="u-category" name="category">
          ${CATEGORIES.map(
            (cat) => `<option value="${esc(cat)}"${unit?.category === cat ? ' selected' : ''}>${esc(cat)}</option>`,
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label for="u-region">Wilayah</label>
        <select id="u-region" name="region">
          ${REGION_NAMES.map(
            (name) => `<option value="${esc(name)}"${unit?.region === name ? ' selected' : ''}>${esc(name)}</option>`,
          ).join('')}
        </select>
      </div>
    </div>
    <div class="field">
      <label for="u-desc">Deskripsi</label>
      <textarea id="u-desc" name="description" rows="2">${value('description')}</textarea>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="u-status">Status unit</label>
        <select id="u-status" name="status">
          ${UNIT_STATUS_OPTIONS.map(
            (status) =>
              `<option value="${status}"${(unit?.status || 'available') === status ? ' selected' : ''}>${esc(
                UNIT_STATUS[status].label,
              )}</option>`,
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label for="u-icon">Ilustrasi</label>
        <select id="u-icon" name="icon">
          ${UNIT_ICONS.map(
            (name) => `<option value="${name}"${(unit?.icon || 'tractor') === name ? ' selected' : ''}>${name}</option>`,
          ).join('')}
        </select>
      </div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="u-scheme">Skema tarif</label>
        <select id="u-scheme" name="scheme">
          ${Object.entries(UNIT_SCHEMES)
            .map(
              ([key, meta]) =>
                `<option value="${key}"${(unit?.scheme || 'per_ha') === key ? ' selected' : ''}>${esc(
                  meta.label,
                )}</option>`,
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label for="u-rate">Tarif dasar (Rp)</label>
        <input class="input" id="u-rate" name="baseRate" type="number" min="0" step="10000" value="${value(
          'baseRate',
          500000,
        )}" required />
      </div>
    </div>
    <div class="form-grid-3">
      <div class="field">
        <label for="u-capacity">Kapasitas</label>
        <input class="input" id="u-capacity" name="capacity" type="number" min="0" step="0.1" value="${value(
          'capacity',
          1,
        )}" required />
      </div>
      <div class="field">
        <label for="u-capunit">Satuan</label>
        <input class="input" id="u-capunit" name="capacityUnit" value="${value('capacityUnit', 'HP')}" required />
      </div>
      <div class="field">
        <label for="u-minorder">Syarat minimum</label>
        <input class="input" id="u-minorder" name="minOrder" value="${value('minOrder', 'Min. 1 ha')}" />
      </div>
    </div>
    <div class="form-grid-3">
      <div class="field">
        <label for="u-fueltype">Jenis BBM</label>
        <select id="u-fueltype" name="fuelType">
          ${['Solar', 'Pertalite']
            .map(
              (fuel) =>
                `<option value="${fuel}"${(unit?.fuelType || 'Solar') === fuel ? ' selected' : ''}>${fuel}</option>`,
            )
            .join('')}
        </select>
      </div>
      <div class="field">
        <label for="u-fuelrate">Konsumsi (L/satuan)</label>
        <input class="input" id="u-fuelrate" name="fuelRate" type="number" min="0" step="0.1" value="${value(
          'fuelRate',
          5,
        )}" required />
      </div>
      <div class="field">
        <label for="u-tank">Tangki (L)</label>
        <input class="input" id="u-tank" name="tankCapacity" type="number" min="0" step="1" value="${value(
          'tankCapacity',
          50,
        )}" />
      </div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="u-hours">Jam kerja terpakai</label>
        <input class="input" id="u-hours" name="operatingHours" type="number" min="0" step="1" value="${value(
          'operatingHours',
          0,
        )}" />
      </div>
      <div class="field">
        <label for="u-service">Servis berikutnya (jam)</label>
        <input class="input" id="u-service" name="nextServiceAt" type="number" min="1" step="1" value="${value(
          'nextServiceAt',
          300,
        )}" />
      </div>
    </div>
    <div class="field">
      <span class="field-label">Kecocokan medan</span>
      <div class="row">
        ${terrainCheckboxes(unit?.terrains || ['Datar'])}
      </div>
    </div>
    <p class="field-hint">Kode unit dibuat otomatis. ${
      isEdit ? 'Perubahan langsung berlaku pada katalog petani.' : ''
    }</p>
  `;
}

function readUnitForm(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  if (name.length < 3) throw new Error('Nama unit minimal 3 karakter.');
  const baseRate = Number(data.get('baseRate'));
  if (!Number.isFinite(baseRate) || baseRate <= 0) throw new Error('Tarif dasar harus lebih dari 0.');
  const capacity = Number(data.get('capacity'));
  if (!Number.isFinite(capacity) || capacity <= 0) throw new Error('Kapasitas harus lebih dari 0.');
  const nextServiceAt = Number(data.get('nextServiceAt'));
  if (!Number.isFinite(nextServiceAt) || nextServiceAt <= 0) {
    throw new Error('Batas jam servis harus lebih dari 0.');
  }
  return {
    name,
    category: data.get('category'),
    region: data.get('region'),
    description: String(data.get('description') || '').trim(),
    icon: data.get('icon'),
    status: data.get('status'),
    scheme: data.get('scheme'),
    baseRate,
    capacity,
    capacityUnit: String(data.get('capacityUnit') || '').trim() || 'HP',
    fuelType: data.get('fuelType'),
    fuelRate: Number(data.get('fuelRate')) || 0,
    tankCapacity: Number(data.get('tankCapacity')) || 0,
    minOrder: String(data.get('minOrder') || '').trim(),
    terrains: data.getAll('terrains'),
    operatingHours: Number(data.get('operatingHours')) || 0,
    nextServiceAt,
  };
}

export async function render(ctx) {
  const [units, bookings] = await Promise.all([db.all('units'), db.all('bookings')]);

  const activeFor = (unitId) =>
    bookings.filter(
      (b) => b.unitId === unitId && ['pending', 'approved', 'in_progress'].includes(b.status),
    );

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Inventaris</span>
        <h1>Armada &amp; servis</h1>
        <p>${units.length} unit terdaftar. Ubah status ketersediaan dan jadwal servis.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary" id="add-unit">${icon('plus', 16)} Tambah unit</button>
      </div>
    </div>

    <div class="stat-grid">
      ${UNIT_STATUS_OPTIONS.map((status) => {
        const count = units.filter((u) => u.status === status).length;
        return `<article class="stat-card">
          <div class="stat-label"><span>${esc(UNIT_STATUS[status].label)}</span></div>
          <div class="stat-value">${count}</div>
          <div class="stat-hint">unit</div>
        </article>`;
      }).join('')}
      <article class="stat-card">
        <div class="stat-label"><span>Perlu servis</span></div>
        <div class="stat-value">${units.filter((u) => serviceProgress(u) >= 85).length}</div>
        <div class="stat-hint">≥ 85% dari batas jam</div>
      </article>
    </div>

    <section class="card card-pad">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Unit</th><th>Kategori</th><th>Wilayah</th><th>Tarif</th><th>Servis</th><th>Status</th><th style="text-align:right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${units
              .map((unit) => {
                const progress = serviceProgress(unit);
                return `<tr>
                  <td>
                    <div class="cell-stack">
                      <strong>${esc(unit.name)}</strong>
                      <span>${esc(formatCapacity(unit))} · ${esc(unit.id)}</span>
                    </div>
                  </td>
                  <td>${esc(unit.category)}</td>
                  <td>${esc(unit.region)}</td>
                  <td class="mono">
                    ${rupiah(unit.baseRate)}
                    <div class="text-xs text-muted">${esc(schemeLabel(unit.scheme))}</div>
                  </td>
                  <td style="min-width:120px">
                    ${progressBar(progress)}
                    <span class="text-xs text-muted">${esc(
                      unit.operatingHours.toLocaleString('id-ID'),
                    )}/${esc(unit.nextServiceAt.toLocaleString('id-ID'))} j</span>
                  </td>
                  <td>
                    <select data-unit-status="${esc(unit.id)}" aria-label="Status ${esc(unit.name)}">
                      ${UNIT_STATUS_OPTIONS.map(
                        (status) =>
                          `<option value="${status}"${unit.status === status ? ' selected' : ''}>${esc(
                            UNIT_STATUS[status].label,
                          )}</option>`,
                      ).join('')}
                    </select>
                  </td>
                  <td class="actions">
                    <button type="button" class="btn btn-outline btn-sm" data-unit-edit="${esc(
                      unit.id,
                    )}">Edit</button>
                    <button type="button" class="btn btn-danger btn-sm" data-unit-delete="${esc(
                      unit.id,
                    )}">Hapus</button>
                  </td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  return {
    title: 'Armada & servis',
    html: content,
    bind(root, viewCtx) {
      const openUnitForm = (unit) => {
        openModal({
          title: unit ? `Edit ${unit.name}` : 'Tambah unit baru',
          subtitle: unit ? 'Perubahan berlaku langsung pada katalog.' : 'Unit baru tersedia untuk disewa setelah disimpan.',
          body: unitFormBody(unit),
          wide: true,
          submitLabel: unit ? 'Simpan perubahan' : 'Tambah unit',
          onSubmit: async (form) => {
            const payload = readUnitForm(form);
            if (unit) {
              await db.update('units', unit.id, payload);
              toast('Unit diperbarui.');
            } else {
              await db.insert('units', {
                id: uid('unit'),
                ...payload,
                createdAt: new Date().toISOString(),
              });
              toast('Unit baru ditambahkan.');
            }
            await viewCtx.refresh();
          },
        });
      };

      root.querySelector('#add-unit').addEventListener('click', () => openUnitForm(null));

      root.addEventListener('click', (event) => {
        const editBtn = event.target.closest('[data-unit-edit]');
        if (editBtn) {
          const unit = units.find((u) => u.id === editBtn.dataset.unitEdit);
          if (unit) openUnitForm(unit);
          return;
        }

        const deleteBtn = event.target.closest('[data-unit-delete]');
        if (deleteBtn) {
          const unit = units.find((u) => u.id === deleteBtn.dataset.unitDelete);
          if (!unit) return;
          const blockers = activeFor(unit.id);
          if (blockers.length) {
            toast(`Unit masih dipakai ${blockers.length} pesanan aktif. Selesaikan dulu.`, 'error');
            return;
          }
          confirmDialog({
            title: `Hapus ${unit.name}?`,
            message: 'Unit akan dihapus dari katalog dan tidak bisa dikembalikan.',
            confirmLabel: 'Hapus unit',
            onConfirm: async () => {
              await db.remove('units', unit.id);
              toast('Unit dihapus.');
              await viewCtx.refresh();
            },
          });
        }
      });

      root.querySelectorAll('[data-unit-status]').forEach((select) => {
        select.addEventListener('change', async () => {
          const unit = units.find((u) => u.id === select.dataset.unitStatus);
          if (!unit) return;
          if (select.value === 'maintenance' && activeFor(unit.id).length) {
            toast('Tidak bisa menservis unit yang masih punya pesanan aktif.', 'error');
            select.value = unit.status;
            return;
          }
          await db.update('units', unit.id, { status: select.value });
          toast(`Status ${unit.name} diubah menjadi ${UNIT_STATUS[select.value].label}.`);
          await viewCtx.refresh();
        });
      });
    },
  };
}
