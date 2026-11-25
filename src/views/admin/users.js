import { REGION_NAMES, ROLES } from '../../lib/constants.js';
import { db } from '../../lib/store.js';
import { createStaffAccount } from '../../lib/auth.js';
import { badge, statCard } from '../../ui/kit.js';
import { esc, formatDate, rupiah } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { confirmDialog, openModal, toast } from '../../ui/overlay.js';

export async function render(ctx) {
  const { user: currentUser } = ctx;
  const users = await db.all('users');
  const bookings = await db.all('bookings');

  const sorted = [...users].sort((a, b) => {
    const order = { admin: 0, operator: 1, farmer: 2 };
    if (order[a.role] !== order[b.role]) return order[a.role] - order[b.role];
    return a.name.localeCompare(b.name);
  });

  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">Akses &amp; SDM</span>
        <h1>Pengguna &amp; operator</h1>
        <p>Kelola akun petani, operator, dan admin. Akun operator dapat langsung ditugaskan ke pesanan.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-primary" id="add-staff">${icon('plus', 16)} Tambah akun staf</button>
      </div>
    </div>

    <div class="stat-grid">
      ${statCard({
        label: 'Petani',
        value: users.filter((u) => u.role === 'farmer').length,
        hint: 'Akun pemesan',
        iconName: 'seedling',
        accent: true,
      })}
      ${statCard({
        label: 'Operator',
        value: users.filter((u) => u.role === 'operator').length,
        hint: `${users.filter((u) => u.role === 'operator' && u.available).length} siap tugas`,
        iconName: 'users',
      })}
      ${statCard({
        label: 'Admin KUD',
        value: users.filter((u) => u.role === 'admin').length,
        hint: 'Akses penuh konsol',
        iconName: 'shield',
      })}
      ${statCard({
        label: 'Nonaktif',
        value: users.filter((u) => u.status !== 'active').length,
        hint: 'Tidak dapat masuk',
        iconName: 'alert',
      })}
    </div>

    <section class="card card-pad">
      <div class="card-head">
        <div><h2>Daftar akun</h2><p>Perubahan peran berlaku pada tampilan setelah pengguna masuk kembali.</p></div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Nama</th><th>Peran</th><th>Wilayah</th><th>Kontak</th><th>Status</th><th>Terdaftar</th><th style="text-align:right">Aksi</th></tr>
          </thead>
          <tbody>
            ${sorted
              .map((user) => {
                const isSelf = user.id === currentUser.id;
                const active = user.status === 'active';
                const assigned = bookings.filter(
                  (b) => b.operatorId === user.id && ['approved', 'in_progress'].includes(b.status),
                ).length;
                return `<tr>
                  <td>
                    <div class="cell-stack">
                      <strong>${esc(user.name)}${isSelf ? ' (Anda)' : ''}</strong>
                      <span>${esc(user.email)}</span>
                      ${
                        user.role === 'operator' && user.wagePerDay
                          ? `<span>Upah ${rupiah(user.wagePerDay)}/hari${assigned ? ` · ${assigned} tugas aktif` : ''}</span>`
                          : ''
                      }
                    </div>
                  </td>
                  <td>
                    <select data-user-role="${esc(user.id)}" ${isSelf ? 'disabled' : ''} aria-label="Peran ${esc(
                      user.name,
                    )}">
                      ${Object.entries(ROLES)
                        .map(
                          ([key, role]) =>
                            `<option value="${key}"${user.role === key ? ' selected' : ''}>${esc(
                              role.label,
                            )}</option>`,
                        )
                        .join('')}
                    </select>
                  </td>
                  <td><div class="cell-stack">${esc(user.region || '—')}<span>${esc(
                    user.organization || '—',
                  )}</span></div></td>
                  <td>${esc(user.phone || '—')}</td>
                  <td>${badge(active ? 'Aktif' : 'Nonaktif', active ? 'success' : 'danger')}</td>
                  <td>${esc(formatDate(String(user.createdAt || '').slice(0, 10)))}</td>
                  <td class="actions">
                    ${
                      isSelf
                        ? '<span class="text-xs text-muted">Akun Anda</span>'
                        : `<button type="button" class="btn ${
                            active ? 'btn-danger' : 'btn-outline'
                          } btn-sm" data-user-toggle="${esc(user.id)}">${
                            active ? 'Nonaktifkan' : 'Aktifkan'
                          }</button>`
                    }
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
    title: 'Pengguna & operator',
    html: content,
    bind(root, viewCtx) {
      root.querySelector('#add-staff').addEventListener('click', () => {
        openModal({
          title: 'Tambah akun staf',
          subtitle: 'Akun operator dan admin hanya dapat dibuat dari konsol ini.',
          wide: true,
          submitLabel: 'Buat akun',
          body: `<div data-modal-error></div>
            <div class="form-grid">
              <div class="field">
                <label for="s-name">Nama lengkap</label>
                <input class="input" id="s-name" name="name" required />
              </div>
              <div class="field">
                <label for="s-role">Peran</label>
                <select id="s-role" name="role">
                  <option value="operator">Operator</option>
                  <option value="admin">Admin KUD</option>
                </select>
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="s-email">Email</label>
                <input class="input" id="s-email" name="email" type="email" required />
              </div>
              <div class="field">
                <label for="s-phone">No. WhatsApp</label>
                <input class="input" id="s-phone" name="phone" type="tel" />
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="s-region">Wilayah</label>
                <select id="s-region" name="region">
                  ${REGION_NAMES.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="s-org">Organisasi / KUD</label>
                <input class="input" id="s-org" name="organization" value="${esc(
                  currentUser.organization || 'KUD Tani Makmur',
                )}" />
              </div>
            </div>
            <div class="form-grid">
              <div class="field">
                <label for="s-wage">Upah harian (Rp, operator)</label>
                <input class="input" id="s-wage" name="wagePerDay" type="number" min="0" step="10000" value="180000" />
              </div>
              <div class="field">
                <label for="s-password">Kata sandi awal</label>
                <input class="input" id="s-password" name="password" type="text" value="Operator#2026" required />
                <span class="field-hint">Sampaikan ke pengguna; minta segera diubah.</span>
              </div>
            </div>
          `,
          onSubmit: async (form) => {
            const data = Object.fromEntries(new FormData(form));
            const created = await createStaffAccount({
              name: data.name,
              email: data.email,
              phone: data.phone,
              region: data.region,
              organization: data.organization,
              role: data.role,
              password: data.password,
              wagePerDay: Number(data.wagePerDay),
            });
            toast(`Akun ${created.name} dibuat sebagai ${ROLES[created.role].label}.`);
            await viewCtx.refresh();
          },
        });
      });

      root.querySelectorAll('[data-user-role]').forEach((select) => {
        select.addEventListener('change', async () => {
          const target = users.find((u) => u.id === select.dataset.userRole);
          if (!target) return;
          const nextRole = select.value;
          if (nextRole === target.role) return;

          select.value = target.role; // reset until the change is confirmed
          confirmDialog({
            title: `Ubah peran ${target.name}?`,
            message: `Akun akan beralih dari ${ROLES[target.role].label} menjadi ${ROLES[nextRole].label} dan mendapat akses sesuai peran baru.`,
            confirmLabel: 'Ubah peran',
            tone: 'primary',
            onConfirm: async () => {
              await db.update('users', target.id, {
                role: nextRole,
                ...(nextRole === 'operator'
                  ? { wagePerDay: target.wagePerDay || 150000, available: true, skills: target.skills || [] }
                  : {}),
              });
              toast('Peran pengguna diperbarui.');
              await viewCtx.refresh();
            },
          });
        });
      });

      root.querySelectorAll('[data-user-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = users.find((u) => u.id === btn.dataset.userToggle);
          if (!target) return;
          const nextStatus = target.status === 'active' ? 'suspended' : 'active';
          confirmDialog({
            title: `${nextStatus === 'active' ? 'Aktifkan' : 'Nonaktifkan'} ${target.name}?`,
            message:
              nextStatus === 'active'
                ? 'Pengguna dapat kembali masuk dan mengajukan sewa.'
                : 'Pengguna tidak dapat masuk sampai akun diaktifkan kembali.',
            confirmLabel: nextStatus === 'active' ? 'Aktifkan' : 'Nonaktifkan',
            onConfirm: async () => {
              await db.update('users', target.id, { status: nextStatus });
              toast('Status akun diperbarui.');
              await viewCtx.refresh();
            },
          });
        });
      });
    },
  };
}
