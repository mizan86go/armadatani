import { readFile, writeFile } from 'node:fs/promises';

const QUERIES = {
  sprayer: ['motorized knapsack sprayer', 'mist blower', 'power sprayer Indonesia'],
  thresherCorn: ['maize sheller', 'corn sheller machine', 'corn threshing machine'],
  truck: ['Hino truck Indonesia', 'truck loading sacks', 'truck transporting rice bags'],
  dumptruck: ['Hino dump truck', 'tipper truck Indonesia', 'truck dump agriculture'],
};

const FREE = /^(cc0|public domain|cc by|cc-by|cc by-sa|cc-by-sa)/i;
const stripHtml = (v = '') => String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function search(term) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${term}`,
    gsrnamespace: '6',
    gsrlimit: '10',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '1400',
  }).forEach(([k, v]) => url.searchParams.set(k, v));

  let res;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing)' } });
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Object.values(json.query?.pages || {})
    .map((page) => {
      const info = page.imageinfo?.[0] || {};
      const meta = info.extmetadata || {};
      return {
        title: page.title,
        thumb: info.thumburl,
        url: info.url,
        width: info.thumbwidth || info.width,
        height: info.thumbheight || info.height,
        license: stripHtml(meta.LicenseShortName?.value),
        artist: stripHtml(meta.Artist?.value).slice(0, 80),
        page: info.descriptionurl,
      };
    })
    .filter((item) => item.thumb && item.width >= 800 && FREE.test(item.license));
}

const all = JSON.parse(await readFile(new URL('./candidates.json', import.meta.url), 'utf8'));
for (const [key, terms] of Object.entries(QUERIES)) {
  const seen = new Set((all[key] || []).map((i) => i.title));
  const rows = [];
  for (const term of terms) {
    try {
      for (const item of await search(term)) {
        if (seen.has(item.title)) continue;
        seen.add(item.title);
        rows.push({ ...item, term });
      }
    } catch (error) {
      console.error(key, term, error.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  all[key] = rows.slice(0, 16);
  rows.slice(0, 16).forEach((x, i) =>
    console.log(`${key}#${i} | ${x.title.replace('File:', '').slice(0, 85)} | ${x.width}x${x.height} | ${x.license}`),
  );
}
await writeFile(new URL('./candidates2.json', import.meta.url), JSON.stringify(all, null, 2));
