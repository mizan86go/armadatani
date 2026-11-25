import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PROFILE = 'C:/Users/Mizan/Documents/CHAT/prored/.tmp-img/cdp-profile';
const BASE = 'http://localhost:4173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=9333',
    `--user-data-dir=${PROFILE}`,
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function targetUrl() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:9333/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome DevTools not reachable');
}

const wsUrl = await targetUrl();
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let seq = 0;
const pending = new Map();
const errors = [];
const failedRequests = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description || 'exception');
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (msg.method === 'Network.loadingFailed' && !msg.params.errorText.includes('ERR_ABORTED')) {
    failedRequests.push(msg.params.errorText);
  }
};

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || 'eval failed');
  return result.value;
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(`.tmp-img/screens/${name}.png`, Buffer.from(data, 'base64'));
  console.log('shot', name);
}

async function goto(hash) {
  await send('Page.navigate', { url: `${BASE}/#${hash}` });
  await sleep(1200);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});

// 1. Landing page opens first, no login.
await goto('/');
const landing = await evaluate(`(() => ({
  hash: location.hash,
  title: document.title,
  heroTitle: document.querySelector('.lp-hero h1')?.textContent.trim().slice(0, 60),
  featured: document.querySelectorAll('.lp-unit').length,
  stats: [...document.querySelectorAll('.lp-stats dt')].map(e => e.textContent),
  h1: getComputedStyle(document.querySelector('.lp-hero h1')).fontSize,
  imgs: [...document.querySelectorAll('.lp img')].map(i => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0 })),
}))()`);
console.log('LANDING', JSON.stringify({ ...landing, imgs: landing.imgs.length }, null, 0));
console.log('LANDING IMAGES NOT LOADED', landing.imgs.filter((i) => !i.ok));
await shot('landing-hero');

// Scroll through lazily loaded photos.
await evaluate(`window.scrollTo(0, document.querySelector('#armada').offsetTop - 60)`);
await sleep(1400);
await shot('landing-armada');
await evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
await sleep(1600);
const lazy = await evaluate(
  `[...document.querySelectorAll('.lp img')].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.getAttribute('src'))`,
);
console.log('LAZY IMAGES NOT LOADED', lazy);
await evaluate(`window.scrollTo(0, 0)`);
await sleep(400);
await shot('landing-top-again');

// 2. Login as farmer and inspect catalog + gallery.
await goto('/masuk');
await evaluate(`(() => {
  const form = document.querySelector('#login-form');
  form.querySelector('[name="email"]').value = 'petani@armadatani.id';
  form.querySelector('[name="password"]').value = 'Petani#2026';
  form.requestSubmit();
})()`);
await sleep(2000);
console.log('AFTER LOGIN', await evaluate(`location.hash`));

await goto('/petani/katalog');
await sleep(800);
const catalog = await evaluate(`(() => ({
  cards: document.querySelectorAll('.unit-card').length,
  cardsWithPhoto: document.querySelectorAll('.unit-card .unit-photo img').length,
  broken: [...document.querySelectorAll('.unit-card .unit-photo img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
  detailButtons: document.querySelectorAll('[data-unit-detail]').length,
}))()`);
console.log('CATALOG', JSON.stringify(catalog));
await shot('catalog');

await evaluate(`document.querySelector('[data-unit-detail]').click()`);
await sleep(900);
const modal = await evaluate(`(() => ({
  title: document.querySelector('.modal-head h2')?.textContent,
  slides: document.querySelectorAll('.modal .gallery-slide').length,
  active: [...document.querySelectorAll('.modal .gallery-slide')].findIndex(s => s.classList.contains('is-active')),
  counter: document.querySelector('.modal [data-gallery-count]')?.textContent,
  imgOk: [...document.querySelectorAll('.modal .gallery-slide img')].map(i => i.complete && i.naturalWidth > 0),
}))()`);
console.log('DETAIL', JSON.stringify(modal));
await shot('detail-gallery');

await evaluate(`document.querySelector('.modal [data-gallery-next]').click()`);
await sleep(500);
const afterNext = await evaluate(`document.querySelector('.modal [data-gallery-count]')?.textContent`);
console.log('AFTER NEXT', afterNext);
await shot('detail-gallery-2');

// 3. Other role smokes (routes and shell).
await evaluate(`document.querySelector('[data-modal-close]').click()`);
await sleep(300);
await goto('/admin');
const admin = await evaluate(`(() => ({
  hash: location.hash,
  cards: document.querySelectorAll('.stat-card').length,
  note: document.querySelector('.alert')?.textContent.trim().slice(0, 40),
}))()`);
console.log('ADMIN', JSON.stringify(admin));

// 4. Mobile landing.
await goto('/masuk');
await evaluate(`document.querySelector('[data-logout]')?.click()`);
await sleep(800);
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await goto('/');
await shot('landing-mobile');
const mobile = await evaluate(`(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  h1: document.querySelector('.lp-hero h1')?.getBoundingClientRect().width,
}))()`);
console.log('MOBILE', JSON.stringify(mobile));

console.log('CONSOLE ERRORS', errors);
console.log('FAILED REQUESTS', failedRequests);
ws.close();
chrome.kill();
