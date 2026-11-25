import { HOME_PATH, ROLES } from '../lib/constants.js';
import { initials, esc } from '../lib/utils.js';
import { icon } from './icons.js';

const NAV = {
  farmer: [
    { section: 'Ruang petani' },
    { path: '/petani', label: 'Ringkasan', iconName: 'home' },
    { path: '/petani/katalog', label: 'Katalog alat', iconName: 'grid' },
    { path: '/petani/sewa', label: 'Ajukan sewa', iconName: 'calendar' },
    { path: '/petani/pesanan', label: 'Pesanan saya', iconName: 'clipboard' },
  ],
  admin: [
    { section: 'Konsol KUD' },
    { path: '/admin', label: 'Ringkasan', iconName: 'home' },
    { path: '/admin/pesanan', label: 'Pesanan masuk', iconName: 'clipboard' },
    { path: '/admin/armada', label: 'Armada & servis', iconName: 'truck' },
    { section: 'Operasional' },
    { path: '/admin/pengguna', label: 'Pengguna & operator', iconName: 'users' },
    { path: '/admin/laporan', label: 'Log BBM & pendapatan', iconName: 'fuel' },
  ],
  operator: [
    { section: 'Ruang operator' },
    { path: '/operator', label: 'Tugas saya', iconName: 'flag' },
    { path: '/operator/riwayat', label: 'Riwayat & setoran', iconName: 'chart' },
  ],
};

function isActive(path, activePath) {
  if (path === activePath) return true;
  if (path === HOME_PATH.admin && activePath === '/admin') return true;
  if (path === '/petani' || path === '/admin' || path === '/operator') return false;
  return activePath.startsWith(`${path}/`);
}

export function renderShell({ user, title, content, activePath, counts = {} }) {
  const role = ROLES[user.role] || ROLES.farmer;
  const navItems = NAV[user.role] || [];

  const navMarkup = navItems
    .map((item) => {
      if (item.section) return `<div class="nav-section-label">${esc(item.section)}</div>`;
      const count = item.path === '/admin/pesanan' ? counts.pending : 0;
      return `<a class="nav-item${isActive(item.path, activePath) ? ' active' : ''}" href="#${item.path}">
        ${icon(item.iconName, 17)}
        <span>${esc(item.label)}</span>
        ${count ? `<span class="nav-count">${count}</span>` : ''}
      </a>`;
    })
    .join('');

  return `
    <div class="app-shell" id="app-shell">
      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="sidebar-brand">
          <span class="brand-mark">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M6 21h5.5l2.2-7h5.6l2 4h4.7" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="10" cy="23.5" r="2.8" stroke="#fff" stroke-width="1.9"/>
              <circle cx="22" cy="23.5" r="2.3" stroke="#fff" stroke-width="1.9"/>
            </svg>
          </span>
          <span class="brand-text">
            <strong>ArmadaTani</strong>
            <span>${esc(role.label)}</span>
          </span>
        </div>

        <nav class="sidebar-nav">${navMarkup}</nav>

        <div class="sidebar-foot">
          <div class="user-card">
            <span class="avatar">${esc(initials(user.name))}</span>
            <span class="user-card-meta">
              <strong>${esc(user.name)}</strong>
              <span>${esc(user.region || role.label)}</span>
            </span>
          </div>
          <button class="btn btn-ghost btn-sm btn-block" type="button" data-logout style="color:#c3d8cd">
            ${icon('logout', 16)} Keluar
          </button>
        </div>
      </aside>

      <div class="sidebar-scrim" data-close-nav></div>

      <div class="main-col">
        <header class="topbar">
          <button class="icon-btn sidebar-toggle" type="button" data-open-nav aria-label="Buka menu">
            ${icon('menu', 18)}
          </button>
          <div class="topbar-title">${esc(title)}</div>
          <div class="topbar-actions">
            <span class="badge badge-primary">${esc(role.label)}</span>
            <span class="avatar" title="${esc(user.name)}">${esc(initials(user.name))}</span>
          </div>
        </header>
        <main class="page" id="page">${content}</main>
      </div>
    </div>
  `;
}
