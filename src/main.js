import './styles/main.css';

import { HOME_PATH } from './lib/constants.js';
import { getCurrentUser, logout } from './lib/auth.js';
import { db, initStore } from './lib/store.js';
import { currentRoute, navigate, startRouter } from './lib/router.js';
import { initGalleries } from './ui/gallery.js';
import { mountOverlays, toast } from './ui/overlay.js';
import { renderShell } from './ui/shell.js';
import { esc } from './lib/utils.js';

import * as LandingView from './views/landing.js';
import * as LoginView from './views/auth/login.js';
import * as RegisterView from './views/auth/register.js';
import * as FarmerHome from './views/farmer/home.js';
import * as FarmerCatalog from './views/farmer/catalog.js';
import * as FarmerBooking from './views/farmer/booking.js';
import * as FarmerOrders from './views/farmer/orders.js';
import * as AdminHome from './views/admin/home.js';
import * as AdminBookings from './views/admin/bookings.js';
import * as AdminFleet from './views/admin/fleet.js';
import * as AdminUsers from './views/admin/users.js';
import * as AdminReports from './views/admin/reports.js';
import * as OperatorTasks from './views/operator/tasks.js';
import * as OperatorHistory from './views/operator/history.js';

const ROUTES = {
  '/': { layout: 'landing', public: true, render: LandingView.render },
  '/masuk': { layout: 'auth', public: true, render: LoginView.render },
  '/daftar': { layout: 'auth', public: true, render: RegisterView.render },

  '/petani': { role: 'farmer', render: FarmerHome.render },
  '/petani/katalog': { role: 'farmer', render: FarmerCatalog.render },
  '/petani/sewa': { role: 'farmer', render: FarmerBooking.render },
  '/petani/pesanan': { role: 'farmer', render: FarmerOrders.render },

  '/admin': { role: 'admin', render: AdminHome.render },
  '/admin/pesanan': { role: 'admin', render: AdminBookings.render },
  '/admin/armada': { role: 'admin', render: AdminFleet.render },
  '/admin/pengguna': { role: 'admin', render: AdminUsers.render },
  '/admin/laporan': { role: 'admin', render: AdminReports.render },

  '/operator': { role: 'operator', render: OperatorTasks.render },
  '/operator/riwayat': { role: 'operator', render: OperatorHistory.render },
};

const app = document.getElementById('app');
let renderToken = 0;

function fatalView(message) {
  return `<div class="auth-main" style="min-height:100vh">
    <div class="auth-card">
      <div class="card card-pad stack">
        <h1>Terjadi kesalahan</h1>
        <p class="text-muted">${esc(message)}</p>
        <a class="btn btn-primary" href="#/">Kembali ke beranda</a>
      </div>
    </div>
  </div>`;
}

function notFoundView(user, path) {
  const content = `
    <div class="page-head">
      <div>
        <span class="eyebrow">404</span>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat <code>${esc(path)}</code> tidak tersedia. Periksa kembali atau kembali ke ringkasan.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-primary" href="#${HOME_PATH[user.role]}">Kembali ke ringkasan</a>
      </div>
    </div>`;
  return renderShell({ user, title: 'Halaman tidak ditemukan', content, activePath: path });
}

async function renderRoute() {
  const token = ++renderToken;
  const { path, query } = currentRoute();
  const user = await getCurrentUser();

  const route = ROUTES[path];
  if (!route) {
    if (!user) {
      navigate('/masuk');
      return;
    }
    app.innerHTML = notFoundView(user, path);
    return;
  }

  if (route.public) {
    if (user && path !== '/') {
      navigate(HOME_PATH[user.role]);
      return;
    }
  } else if (!user) {
    navigate(`/masuk?next=${encodeURIComponent(path)}`);
    return;
  } else if (route.role && route.role !== user.role) {
    toast('Halaman itu tidak tersedia untuk peran Anda.', 'error');
    navigate(HOME_PATH[user.role]);
    return;
  }

  try {
    const ctx = { user, query, path, navigate, refresh: renderRoute };
    const result = await route.render(ctx);
    if (token !== renderToken) return;

    const counts = {};
    if (user?.role === 'admin') {
      const bookings = await db.all('bookings');
      counts.pending = bookings.filter((b) => b.status === 'pending').length;
    }

    const isBareLayout = route.layout === 'auth' || route.layout === 'landing';
    app.innerHTML = isBareLayout
      ? result.html
      : renderShell({
          user,
          title: result.title,
          content: result.html,
          activePath: path,
          counts,
        });

    document.title = `${result.title} · ArmadaTani`;
    result.bind?.(app, ctx);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  } catch (error) {
    console.error('[render]', error);
    if (token !== renderToken) return;
    app.innerHTML = fatalView(error.message || 'Gagal memuat halaman.');
  }
}

document.addEventListener('click', (event) => {
  const navTarget = event.target.closest('[data-nav]');
  if (navTarget) {
    event.preventDefault();
    navigate(navTarget.getAttribute('data-nav'));
    return;
  }

  if (event.target.closest('[data-logout]')) {
    logout();
    toast('Anda telah keluar dari akun.');
    navigate('/masuk');
    return;
  }

  if (event.target.closest('[data-open-nav]')) {
    document.getElementById('app-shell')?.classList.add('nav-open');
    return;
  }

  if (event.target.closest('[data-close-nav]')) {
    document.getElementById('app-shell')?.classList.remove('nav-open');
    return;
  }

  const dismiss = event.target.closest('[data-dismiss-alert]');
  if (dismiss) dismiss.closest('.alert')?.remove();
});

async function boot() {
  mountOverlays();
  initGalleries();
  await initStore();
  startRouter(renderRoute);
}

boot().catch((error) => {
  console.error('[boot]', error);
  app.innerHTML = fatalView(error.message || 'Aplikasi gagal dijalankan.');
});
