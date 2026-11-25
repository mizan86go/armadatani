import { writeFile, mkdir } from 'node:fs/promises';

const terms = ['orchard sprayer', 'airblast sprayer', 'wheelbarrow sprayer', 'cart sprayer'];
const FREE = /^(cc0|public domain|cc by|cc-by|cc by-sa|cc-by-sa)/i;
const strip = (v = '') => String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rows = [];
const seen = new Set();
for (const term of terms) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query', format: 'json', generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`, gsrnamespace: '6', gsrlimit: '10',
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '520',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0' } });
  if (!res.ok) continue;
  const json = await res.json();
  for (const page of Object.values(json.query?.pages || {})) {
    const info = page.imageinfo?.[0] || {};
    const license = strip(info.extmetadata?.LicenseShortName?.value);
    if (!info.thumburl || seen.has(page.title) || !FREE.test(license)) continue;
    seen.add(page.title);
    rows.push({ title: page.title.replace(/^File:/, ''), thumb: info.thumburl, license, page: info.descriptionurl });
  }
  await new Promise((r) => setTimeout(r, 600));
}

await mkdir(new URL('./preview/', import.meta.url), { recursive: true });
const picks = rows.slice(0, 12);
for (let i = 0; i < picks.length; i += 1) {
  const dest = new URL(`./preview/sp-${i}.jpg`, import.meta.url);
  const res = await fetch(picks[i].thumb);
  if (res.ok) await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`sp-${i} | ${picks[i].title.slice(0, 70)} | ${picks[i].license}`);
}
await writeFile(
  new URL('./sprayer-picks.json', import.meta.url),
  JSON.stringify(picks, null, 2),
);

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#111;color:#fff;font:12px sans-serif;padding:8px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}figure{margin:0;background:#000}
img{width:100%;height:140px;object-fit:cover;display:block}figcaption{padding:2px;color:#ffd479}
</style><div class="g">${picks
  .map((p, i) => `<figure><img src="../preview/sp-${i}.jpg"><figcaption>sp-${i}</figcaption></figure>`)
  .join('')}</div>`;
await writeFile(new URL('./sheets/sprayer.html', import.meta.url), html);
