import { login } from '../../lib/auth.js';
import { HOME_PATH, ROLES } from '../../lib/constants.js';
import { esc } from '../../lib/utils.js';
import { icon, starIcon } from '../../ui/icons.js';
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
        <h1 class="auth-title">Satu tempat untuk <em>sewa alsintan</em> dan armada panen.</h1>
        <p class="auth-lead">Petani, admin KUD, dan operator lapangan bekerja pada data yang sama — jadwal anti-bentrok, estimasi biaya transparan, dan progres tugas yang tercatat.</p>
      </div>

      <ul class="auth-points">
        <li><span class="tick">${starIcon(true, 11)}</span><span>Kalender ketersediaan memblokir jadwal unit dan operator yang bertabrakan.</span></li>
        <li><span class="tick">${starIcon(true, 11)}</span><span>Tarif dasar lepas kunci dibandingkan langsung dengan paket lengkap (BBM + operator).</span></li>
        <li><span class="tick">${starIcon(true, 11)}</span><span>Admin KUD memverifikasi pesanan, operator memperbarui progres dari lapangan.</span></li>
      </ul>

      <ul class="auth-roles">
        ${Object.entries(ROLES)
          .map(
            ([key, role]) =>
              `<li><strong>${esc(role.label)}</strong><span>${esc(role.description)}</span></li>`,
          )
          .join('')}
      </ul>
    </div>
  </section>
`;

export async function render(ctx) {
  const next = ctx.query.get('next') || '';

  const html = `
    <div class="auth-shell">
      ${ASIDE}
      <main class="auth-main">
        <div class="auth-card">
          <a class="auth-back" href="#/">${icon('arrowLeft', 14)} Kembali ke beranda</a>
          <div class="auth-card-head">
            <h1>Masuk ke akun Anda</h1>
            <p>Gunakan email dan kata sandi terdaftar. Tampilan menyesuaikan peran akun.</p>
          </div>

          <form class="auth-form" id="login-form" novalidate>
            <div id="login-alert"></div>
            <input type="hidden" name="next" value="${esc(next)}" />

            <div class="field">
              <label for="login-email">Email</label>
              <input class="input" id="login-email" name="email" type="email" inputmode="email"
                autocomplete="username" placeholder="nama@email.com" required />
            </div>

            <div class="field">
              <div class="spread">
                <label for="login-password">Kata sandi</label>
                <button type="button" class="link-btn" id="toggle-password" aria-pressed="false">lihat</button>
              </div>
              <input class="input" id="login-password" name="password" type="password"
                autocomplete="current-password" placeholder="••••••••" required />
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block">
              Masuk ${icon('arrowRight', 16)}
            </button>
          </form>

          <p class="auth-switch">Belum punya akun? <a href="#/daftar">Daftar sebagai petani</a></p>
        </div>
      </main>
    </div>
  `;

  return {
    title: 'Masuk',
    layout: 'auth',
    html,
    bind(root) {
      const form = root.querySelector('#login-form');
      const alertSlot = root.querySelector('#login-alert');
      const submitBtn = form.querySelector('button[type="submit"]');
      const passwordInput = form.querySelector('#login-password');
      const toggle = root.querySelector('#toggle-password');

      toggle.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        toggle.textContent = show ? 'sembunyikan' : 'lihat';
        toggle.setAttribute('aria-pressed', String(show));
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        alertSlot.innerHTML = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Memproses…';
        try {
          const user = await login(data.get('email'), data.get('password'));
          toast(`Selamat datang, ${user.name.split(' ')[0]}!`);
          const home = HOME_PATH[user.role];
          const target = next && next.startsWith(home) ? next : home;
          ctx.navigate(target);
        } catch (error) {
          alertSlot.innerHTML = alertBox('error', esc(error.message || 'Gagal masuk.'));
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Masuk ${icon('arrowRight', 16)}`;
        }
      });
    },
  };
}
