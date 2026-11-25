import { FUEL_PRICES } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { esc, formatDate, rupiah, todayISO, uid } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { emptyState, statCard } from '../../ui/kit.js';
import { openModal, toast } from '../../ui/overlay.js';

export async function render(ctx) {
  const [logs, units, users] = await Promise.all([
    db.all('fuelLogs'),
    db.all('units'),
    db.all('users'),
  ]);

  const unitById = new Map(units.map((u) => [u.id, u]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const operators = users.filter((u) => u.role === 'operator');

  const sorted = [...logs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const totalLiters = logs.reduce((sum, log) => sum + (Number(log.liters) || 0), 0);
  const totalCost = logs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);
  const totalRevenue = logs.reduce((sum, log) => sum + (Number(log.revenue) || 0), 0);
  const margin = totalRevenue - totalCost;

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Operasional</span>
        <h1>Log BBM &amp; pendapatan</h1>
        <p>Rekap konsumsi bahan bakar dan setoran hasil kerja operator di lapangan.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary" id="add-log">${icon('plus', 16)} Catat log BBM</button>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Total BBM',
        value: `${totalLiters.toLocaleString('id-ID')} L`,
        hint: `${logs.length} catatan`,
        iconName: 'fuel',
        accent: true,
      })}
      ${statCard({
        label: 'Biaya BBM',
        value: rupiah(totalCost),
        hint: 'Akumulasi pengeluaran',
        iconName: 'chart',
      })}
      ${statCard({
        label: 'Pendapatan tercatat',
        value: rupiah(totalRevenue),
        hint: 'Nilai setoran operator',
        iconName: 'chart',
      })}
      ${statCard({
        label: 'Margin kotor',
        value: rupiah(margin),
        hint: totalRevenue ? `${Math.round((margin / totalRevenue) * 100)}% dari pendapatan` : 'Belum ada data',
        iconName: 'shield',
      })}
    </div>

    <section class="card card-pad">
      <div class="card-head">
        <div><h2>Riwayat penggunaan</h2><p>Diurutkan dari tanggal terbaru.</p></div>
      </div>
      ${
        sorted.length
          ? `<div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr><th>Tanggal</th><th>Unit</th><th>Operator</th><th>Volume kerja</th><th>BBM</th><th>Biaya</th><th>Pendapatan</th><th>Catatan</th></tr>
                </thead>
                <tbody>
                  ${sorted
                    .map((log) => {
                      const unit = unitById.get(log.unitId);
                      const operator = userById.get(log.operatorId);
                      return `<tr>
                        <td>${esc(formatDate(log.date))}</td>
                        <td><div class="cell-stack"><strong>${esc(unit?.name || '—')}</strong><span>${esc(
                          unit?.region || '',
                        )}</span></div></td>
                        <td>${esc(operator?.name || '—')}</td>
                        <td>${esc(log.area || '—')}</td>
                        <td class="mono">${esc(log.liters)} L</td>
                        <td class="mono">${rupiah(log.cost)}</td>
                        <td class="mono">${rupiah(log.revenue)}</td>
                        <td><span class="text-xs text-muted">${esc(log.note || '—')}</span></td>
                      </tr>`;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>`
          : emptyState({
              title: 'Belum ada log BBM',
              description: 'Catat konsumsi BBM setelah pekerjaan lapangan selesai.',
              actionLabel: 'Catat sekarang',
              actionAttr: 'data-open-log',
              iconName: 'fuel',
            })
      }
    </section>
  `;

  return {
    title: 'Log BBM & pendapatan',
    html: content,
    bind(root, viewCtx) {
      const openForm = () => {
        openModal({
          title: 'Catat log BBM',
          subtitle: 'Data ini menjadi dasar perhitungan margin operasional.',
          wide: true,
          submitLabel: 'Simpan log',
          body: `<div data-modal-error></div>
            <div class="form-grid">
              <div class="field">
                <label for="l-unit">Unit</label>
                <select id="l-unit" name="unitId">
                  ${units
                    .map(
                      (unit) =>
                        `<option value="${esc(unit.id)}">${esc(unit.name)} — ${esc(unit.fuelType)}</option>`,
                    )
                    .join('')}
                </select>
              </div>
              <div class="field">
                <label for="l-operator">Operator</label>
                <select id="l-operator" name="operatorId">
                  <option value="">—</option>
                  ${operators
                    .map((op) => `<option value="${esc(op.id)}">${esc(op.name)}</option>`)
                    .join('')}
                </select>
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="l-date">Tanggal</label>
                <input class="input" id="l-date" name="date" type="date" value="${todayISO()}" required />
              </div>
              <div class="field">
                <label for="l-area">Volume kerja</label>
                <input class="input" id="l-area" name="area" placeholder="Contoh: 2,5 ha / 3 ritase" />
              </div>
            </div>
            <div class="form-grid-3">
              <div class="field">
                <label for="l-liters">BBM terpakai (L)</label>
                <input class="input" id="l-liters" name="liters" type="number" min="0" step="0.1" value="10" required />
              </div>
              <div class="field">
                <label for="l-cost">Biaya BBM (Rp)</label>
                <input class="input" id="l-cost" name="cost" type="number" min="0" step="1000" value="68000" />
              </div>
              <div class="field">
                <label for="l-revenue">Pendapatan (Rp)</label>
                <input class="input" id="l-revenue" name="revenue" type="number" min="0" step="1000" value="1150000" />
              </div>
            </div>
            <div class="field">
              <label for="l-note">Catatan lapangan</label>
              <textarea id="l-note" name="note" rows="2" placeholder="Kondisi medan, cuaca, atau kendala teknis."></textarea>
            </div>
            <p class="field-hint">Referensi harga: Solar ${rupiah(FUEL_PRICES.Solar)}/L · Pertalite ${rupiah(
              FUEL_PRICES.Pertalite,
            )}/L.</p>
          `,
          onSubmit: async (form) => {
            const data = Object.fromEntries(new FormData(form));
            if (!data.unitId) throw new Error('Pilih unit terlebih dahulu.');
            if (!(Number(data.liters) > 0)) throw new Error('Volume BBM harus lebih dari 0.');
            await db.insert('fuelLogs', {
              id: uid('fl'),
              unitId: data.unitId,
              operatorId: data.operatorId || null,
              bookingId: null,
              date: data.date,
              liters: Number(data.liters),
              cost: Number(data.cost) || 0,
              revenue: Number(data.revenue) || 0,
              area: String(data.area || '').trim(),
              note: String(data.note || '').trim(),
              createdAt: new Date().toISOString(),
            });
            toast('Log BBM disimpan.');
            await viewCtx.refresh();
          },
        });
      };

      root.querySelector('#add-log')?.addEventListener('click', openForm);
      root.querySelector('[data-open-log]')?.addEventListener('click', openForm);
    },
  };
}
