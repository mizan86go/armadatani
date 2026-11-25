/** Minimal hash router: '#/path?query'. Views are resolved in main.js. */

export function currentRoute() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, '')) || '/';
  const [pathPart, search = ''] = raw.split('?');
  const path = pathPart || '/';
  return { path, query: new URLSearchParams(search) };
}

export function navigate(path) {
  const target = path.startsWith('/') ? path : `/${path}`;
  if (window.location.hash === `#${target}`) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = `#${target}`;
}

export function replaceRoute(path) {
  const target = path.startsWith('/') ? path : `/${path}`;
  window.history.replaceState(null, '', `#${target}`);
}

export function startRouter(handler) {
  window.addEventListener('hashchange', handler);
  handler();
}

export function linkTo(path) {
  return `#${path}`;
}
