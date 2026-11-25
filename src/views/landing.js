import { CATEGORIES, REGIONS, ROLES, REGION_NAMES } from '../lib/constants.js';
import { db } from '../lib/store.js';
import { schemeLabel } from '../lib/domain.js';
import { esc, rupiah } from '../lib/utils.js';
import { LANDING_IMAGES, UNIT_IMAGES } from '../data/images.js';
import { icon } from '../ui/icons.js';

const FEATURED_UNITS = ['unit-tr4-01', 'unit-cmb-08', 'unit-drn-05', 'unit-trk-11'];

const BRAND_MARK = `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <rect width="32" height="32" rx="8" fill="#1b4332" />
  <path d="M6 21h5.5l2.2-7h5.6l2 4h4.7" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="23.5" r="2.8" stroke="#fff" stroke-width="1.9"/>
  <circle cx="22" cy="23.5" r="2.3" stroke="#fff" stroke-width="1.9"/>
</svg>`;

const ROLE_POINTS = {
  farmer: ['Katalog lengkap dengan foto dan spesifikasi unit', 'Kalender ketersediaan 14 hari', 'Estimasi biaya sebelum mengajukan'],
  admin: ['Verifikasi pesanan dan penugasan operator', 'Kelola armada, servis, dan pengguna', 'Log BBM serta pendapatan armada'],
  operator: ['Daftar tugas lapangan harian', 'Perbarui status pekerjaan', 'Riwayat tugas dan setoran'],
};

const STEPS = [
  {
    title: 'Pilih alat atau armada',
    body: 'Bandingkan kapasitas, wilayah, dan tarif. Semua unit dilengkapi foto asli dan spesifikasi teknis.',
  },
  {
    title: 'Ajukan tanggal sewa',
    body: 'Kalender menolak tanggal yang bertabrakan dengan pesanan lain atau jadwal servis unit.',
  },
  {
    title: 'Admin KUD memverifikasi',
    body: 'Pesanan dan kebutuhan operator dicek, lalu statusnya diperbarui di ruang admin.',
  },
  {
    title: 'Operator bekerja di lapangan',
    body: 'Progres, konsumsi BBM, dan hasil pekerjaan dicatat sampai pesanan selesai.',
  },
];

function featuredCard(unit, href) {
  const cover = UNIT_IMAGES[unit.id]?.[0];
  return `
    <article class="lp-unit">
      <a class="lp-unit-media" href="${href}" aria-label="Lihat ${esc(unit.name)}">
        ${
          cover
            ? `<img src="${esc(cover.src)}" alt="${esc(cover.alt)}" width="900" height="600" loading="lazy" decoding="async" />`
            : ''
        }
      </a>
      <div class="lp-unit-body">
        <span class="lp-unit-meta">${esc(unit.region)} · ${esc(unit.category.replace('Armada Angkut Hasil Kebun', 'Armada angkut'))}</span>
        <h3>${esc(unit.name)}</h3>
        <p class="lp-unit-price">${rupiah(unit.baseRate)} <span>${esc(schemeLabel(unit.scheme))}</span></p>
      </div>
    </article>
  `;
}

export async function render(ctx) {
  const { user } = ctx;
  const [units, packages] = await Promise.all([db.all('units'), db.all('packages')]);
  const byId = new Map(units.map((unit) => [unit.id, unit]));
  const featured = FEATURED_UNITS.map((id) => byId.get(id)).filter(Boolean);
  const entering = user ? null : '#/daftar';
  const catalogHref = user
    ? '#/petani/katalog'
    : `#/masuk?next=${encodeURIComponent('/petani/katalog')}`;

  const stats = [
    { value: units.length, label: 'unit terdaftar' },
    { value: REGIONS.length, label: 'wilayah layanan' },
    { value: packages.length, label: 'paket kerja' },
  ];

  const html = `
    <div class="lp">
      <header class="lp-nav">
        <a class="lp-brand" href="#/">${BRAND_MARK}<span>ArmadaTani</span></a>
        <nav class="lp-nav-links" aria-label="Bagian halaman">
          <button type="button" data-scroll="layanan">Layanan</button>
          <button type="button" data-scroll="armada">Armada</button>
          <button type="button" data-scroll="cara-kerja">Cara kerja</button>
          <button type="button" data-scroll="peran">Peran</button>
        </nav>
        <div class="lp-nav-actions">
          ${
            user
              ? `<a class="lp-btn lp-btn-solid" href="#${esc(user.role === 'farmer' ? '/petani' : user.role === 'admin' ? '/admin' : '/operator')}">Buka ruang kerja</a>`
              : `<a class="lp-btn lp-btn-ghost" href="#/masuk">Masuk</a>
                 <a class="lp-btn lp-btn-solid" href="#/daftar">Daftar</a>`
          }
        </div>
      </header>

      <main>
        <section class="lp-hero">
          <div class="lp-hero-copy">
            <span class="lp-eyebrow">Koperasi Unit Desa · Aceh</span>
            <h1>Alat pertanian dan armada angkut, <em>siap saat musimnya tiba.</em></h1>
            <p class="lp-lead">
              ArmadaTani menyatukan katalog alsintan, jadwal sewa, dan operator lapangan dalam satu
              alur. Petani tidak perlu lagi menebak ketersediaan alat atau menawar biaya di kantor KUD.
            </p>
            <div class="lp-hero-actions">
              <a class="lp-btn lp-btn-solid lp-btn-lg" href="${entering || catalogHref}">
                ${user ? 'Lihat katalog alat' : 'Mulai sebagai petani'} ${icon('arrowRight', 16)}
              </a>
              <a class="lp-btn lp-btn-outline lp-btn-lg" href="${
                user ? '#/petani/sewa' : '#/masuk'
              }">${user ? 'Ajukan sewa' : 'Masuk ke akun'}</a>
            </div>
            <dl class="lp-stats">
              ${stats
                .map(
                  (item) =>
                    `<div><dt>${item.value}</dt><dd>${esc(item.label)}</dd></div>`,
                )
                .join('')}
            </dl>
          </div>

          <figure class="lp-hero-media">
            <img src="${esc(LANDING_IMAGES.hero.src)}" alt="${esc(
              LANDING_IMAGES.hero.alt,
            )}" width="900" height="600" decoding="async" />
            <figcaption>
              <span>${esc(LANDING_IMAGES.hero.alt)}</span>
            </figcaption>
          </figure>
        </section>

        <section class="lp-section" id="layanan">
          <div class="lp-section-head">
            <span class="lp-eyebrow">Kenapa ArmadaTani</span>
            <h2>Satu data untuk petani, admin KUD, dan operator.</h2>
          </div>
          <div class="lp-features">
            <article>
              <span class="lp-feature-icon">${icon('calendar', 20)}</span>
              <h3>Jadwal tidak bertabrakan</h3>
              <p>Kalender memeriksa bentrok unit <em>dan</em> operator sebelum pesanan disimpan, jadi alat tidak pernah dijanjikan dua kali.</p>
            </article>
            <article>
              <span class="lp-feature-icon">${icon('chart', 20)}</span>
              <h3>Biaya terbuka di depan</h3>
              <p>Tarif lepas kunci, konsumsi BBM, dan upah operator dihitung terpisah. Angka final tidak muncul tiba-tiba di akhir pekerjaan.</p>
            </article>
            <article>
              <span class="lp-feature-icon">${icon('shield', 20)}</span>
              <h3>Tiga peran, satu alur</h3>
              <p>Petani mengajukan, admin memverifikasi, operator mengeksekusi. Setiap perubahan status tercatat pada pesanan yang sama.</p>
            </article>
          </div>
        </section>

        <section class="lp-section" id="armada">
          <div class="lp-section-head lp-section-head-row">
            <div>
              <span class="lp-eyebrow">Armada</span>
              <h2>Unit yang paling sering disewa.</h2>
            </div>
            <a class="lp-link" href="${catalogHref}">Lihat ${units.length} unit ${icon('arrowRight', 15)}</a>
          </div>
          <div class="lp-units">
            ${featured.map((unit) => featuredCard(unit, catalogHref)).join('')}
          </div>
          <p class="lp-note">
            Kategori: ${CATEGORIES.map((category) => esc(category)).join(' · ')}. Wilayah:
            ${REGION_NAMES.map((name) => esc(name)).join(', ')}.
          </p>
        </section>

        <section class="lp-section" id="cara-kerja">
          <div class="lp-section-head">
            <span class="lp-eyebrow">Cara kerja</span>
            <h2>Dari memilih alat sampai pekerjaan selesai.</h2>
          </div>
          <ol class="lp-steps">
            ${STEPS.map(
              (step, index) => `
              <li>
                <span class="lp-step-num">${String(index + 1).padStart(2, '0')}</span>
                <h3>${esc(step.title)}</h3>
                <p>${esc(step.body)}</p>
              </li>`,
            ).join('')}
          </ol>
        </section>

        <section class="lp-photos">
          ${[UNIT_IMAGES['unit-drn-05'][0], LANDING_IMAGES.harvest, LANDING_IMAGES.coffee]
            .map(
              (image) => `
            <figure>
              <img src="${esc(image.src)}" alt="${esc(image.alt)}" width="900" height="600" loading="lazy" decoding="async" />
              <figcaption>${esc(image.alt)}</figcaption>
            </figure>`,
            )
            .join('')}
        </section>

        <section class="lp-section" id="peran">
          <div class="lp-section-head">
            <span class="lp-eyebrow">Peran</span>
            <h2>Tampilan menyesuaikan pekerjaan Anda.</h2>
          </div>
          <div class="lp-roles">
            ${Object.entries(ROLES)
              .map(
                ([key, role], index) => `
              <article class="lp-role">
                <div class="lp-role-head">
                  <span class="lp-role-icon">${icon(
                    key === 'farmer' ? 'seedling' : key === 'admin' ? 'settings' : 'wrench',
                    19,
                  )}</span>
                  <span class="lp-role-index">0${index + 1}</span>
                </div>
                <h3>${esc(role.label)}</h3>
                <p>${esc(role.description)}</p>
                <ul>
                  ${ROLE_POINTS[key].map((point) => `<li>${esc(point)}</li>`).join('')}
                </ul>
              </article>`,
              )
              .join('')}
          </div>
        </section>

        <section class="lp-cta-band">
          <div>
            <span class="lp-eyebrow is-light">Mulai musim ini</span>
            <h2>Ajukan sewa pertama Anda hari ini.</h2>
            <p>Registrasi mandiri hanya untuk akun petani. Akun admin KUD dan operator dibuat oleh pengelola.</p>
          </div>
          <div class="lp-cta-actions">
            <a class="lp-btn lp-btn-solid lp-btn-lg" href="${user ? catalogHref : '#/daftar'}">
              ${user ? 'Buka katalog' : 'Daftar sebagai petani'}
            </a>
            <a class="lp-btn lp-btn-ghost lp-btn-lg is-light" href="#/masuk">${
              user ? 'Ganti akun' : 'Masuk'
            }</a>
          </div>
        </section>
      </main>

      <footer class="lp-footer">
        <div class="lp-footer-main">
          <div class="lp-footer-brand">
            <a class="lp-brand" href="#/">${BRAND_MARK}<span>ArmadaTani</span></a>
            <p>Sewa alsintan dan armada angkut hasil kebun untuk petani di Aceh.</p>
          </div>
        </div>
        <p class="lp-copyright">© ${new Date().getFullYear()} ArmadaTani · KUD Tani Makmur</p>
      </footer>
    </div>
  `;

  return {
    title: 'Sewa alat pertanian & armada angkut',
    layout: 'landing',
    html,
    bind(root) {
      root.querySelectorAll('[data-scroll]').forEach((button) => {
        button.addEventListener('click', () => {
          const target = root.querySelector(`#${button.dataset.scroll}`);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    },
  };
}
