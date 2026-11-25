import { register } from '../../lib/auth.js';
import { REGION_NAMES } from '../../lib/constants.js';
import { esc } from '../../lib/utils.js';
import { icon } from '../../ui/icons.js';
import { alertBox } from '../../ui/kit.js';
import { toast } from '../../ui/overlay.js';

const ASIDE = `
  <section class="auth-aside">
    <div class="auth-brand">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.08)" />
        <path d="M6 21h5.5l2.2-7h5.6l2 4h4.7" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="10" cy="23.5" r="2.8" stroke="#fff" stroke-width="1.9"/>
        <circle cx="22" cy="23.5" r="2.3" stroke="#fff" stroke-width="1.9"/>
      </svg>
      ArmadaTani
    </div>

    <div class="auth-aside-body">
      <div>
        <h1 class="auth-title">Daftar sekali, <em>ajukan sewa</em> kapan pun musimnya.</h1>
        <p class="auth-lead">Akun petani memberi Anda akses katalog armada, kalkulator biaya, kalender ketersediaan, dan riwayat pesanan.</p>
      </div>

      <ul class="auth-points">
        <li><span class="tick">✓</span><span>Simpan unit favorit untuk musim tanam berikutnya.</span></li>
        <li><span class="tick">✓</span><span>Lihat estimasi BBM dan upah operator sebelum mengajukan.</span></li>
        <li><span class="tick">✓</span><span>Pantau status persetujuan dari admin KUD secara real-time.</span></li>
      </ul>
    </div>

    <p class="auth-aside-foot">Akun operator dan admin KUD dibuat oleh admin melalui konsol pengguna.</p>
  </section>
`;

export async function render() {
  const html = `
    <div class="auth-shell">
      ${ASIDE}
      <main class="auth-main">
        <div class="auth-card">
          <a class="auth-back" href="#/">${icon('arrowLeft', 14)} Kembali ke beranda</a>
          <div class="auth-card-head">
            <h1>Buat akun petani</h1>
            <p>Isi data diri dan wilayah layanan agar rekomendasi alat lebih tepat.</p>
          </div>

          <form class="auth-form" id="register-form" novalidate>
            <div id="register-alert"></div>

            <div class="field">
              <label for="reg-name">Nama lengkap / kelompok tani</label>
              <input class="input" id="reg-name" name="name" type="text" autocomplete="name"
                placeholder="Contoh: Darmawan" required />
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="reg-email">Email</label>
                <input class="input" id="reg-email" name="email" type="email" inputmode="email"
                  autocomplete="email" placeholder="nama@email.com" required />
              </div>
              <div class="field">
                <label for="reg-phone">Nomor WhatsApp</label>
                <input class="input" id="reg-phone" name="phone" type="tel" inputmode="tel"
                  autocomplete="tel" placeholder="0812xxxxxxx" required />
              </div>
            </div>

            <div class="field">
              <label for="reg-region">Wilayah layanan</label>
              <select id="reg-region" name="region" required>
                <option value="">Pilih wilayah</option>
                ${REGION_NAMES.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}
              </select>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="reg-password">Kata sandi</label>
                <input class="input" id="reg-password" name="password" type="password"
                  autocomplete="new-password" placeholder="Min. 8 karakter" required />
              </div>
              <div class="field">
                <label for="reg-confirm">Ulangi kata sandi</label>
                <input class="input" id="reg-confirm" name="passwordConfirm" type="password"
                  autocomplete="new-password" placeholder="Ulangi kata sandi" required />
              </div>
            </div>
            <p class="field-hint">Kata sandi minimal 8 karakter serta mengandung huruf dan angka.</p>

            <label class="check" for="reg-agreement">
              <input type="checkbox" id="reg-agreement" name="agreement" required />
              <span>Saya menyetujui ketentuan layanan dan kebijakan penggunaan data ArmadaTani.</span>
            </label>

            <button type="submit" class="btn btn-primary btn-lg btn-block">
              Daftar sebagai petani ${icon('arrowRight', 16)}
            </button>
          </form>

          <p class="auth-switch">Sudah punya akun? <a href="#/masuk">Masuk di sini</a></p>
          <p class="text-xs text-muted" style="text-align:center">
            Butuh akses operator atau admin KUD? Hubungi admin KUD untuk pembuatan akun.
          </p>
        </div>
      </main>
    </div>
  `;

  return {
    title: 'Daftar',
    layout: 'auth',
    html,
    bind(root, ctx) {
      const form = root.querySelector('#register-form');
      const alertSlot = root.querySelector('#register-alert');
      const submitBtn = form.querySelector('button[type="submit"]');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        alertSlot.innerHTML = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Membuat akun…';
        try {
          const user = await register({
            name: data.name,
            email: data.email,
            phone: data.phone,
            region: data.region,
            password: data.password,
            passwordConfirm: data.passwordConfirm,
            agreement: data.agreement === 'on',
          });
          toast(`Akun ${user.name} berhasil dibuat.`);
          ctx.navigate('/petani');
        } catch (error) {
          alertSlot.innerHTML = alertBox('error', esc(error.message || 'Pendaftaran gagal.'));
          if (error.field) {
            const input = form.querySelector(`[name="${error.field}"]`);
            if (input) {
              input.setAttribute('aria-invalid', 'true');
              input.focus();
            }
          }
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Daftar sebagai petani ${icon('arrowRight', 16)}`;
        }
      });
    },
  };
}
