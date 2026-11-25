import { readFile, writeFile } from 'node:fs/promises';

const terms = ['knapsack sprayer', 'backpack sprayer pesticide', 'pesticide spraying plantation', 'mistblower'];
const FREE = /^(cc0|public domain|cc by|cc-by|cc by-sa|cc-by-sa)/i;
const stripHtml = (v = '') => String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const rows = [];
const seen = new Set();

for (const term of terms) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1400',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing)' } });
  if (!res.ok) {
    console.log(term, res.status);
    continue;
  }
  const json = await res.json();
  for (const page of Object.values(json.query?.pages || {})) {
    const info = page.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    const license = stripHtml(meta.LicenseShortName?.value);
    if (!info.thumburl || seen.has(page.title) || !FREE.test(license)) continue;
    seen.add(page.title);
    rows.push({
      title: page.title,
      thumb: info.thumburl,
      width: info.thumbwidth || info.width,
      height: info.thumbheight || info.height,
      license,
      artist: stripHtml(meta.Artist?.value).slice(0, 80),
      page: info.descriptionurl,
      term,
    });
  }
  await new Promise((r) => setTimeout(r, 700));
}

rows.slice(0, 18).forEach((x, i) =>
  console.log(`sprayer2#${i} | ${x.title.replace('File:', '').slice(0, 85)} | ${x.width}x${x.height} | ${x.license}`),
);
const all = JSON.parse(await readFile(new URL('./candidates2.json', import.meta.url), 'utf8'));
all.sprayer2 = rows.slice(0, 18);
await writeFile(new URL('./candidates2.json', import.meta.url), JSON.stringify(all, null, 2));
