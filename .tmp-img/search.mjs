import { writeFile } from 'node:fs/promises';

const QUERIES = {
  tractor4: ['tractor ploughing rice field', 'Kubota tractor', 'tractor paddy field Indonesia'],
  handtractor: ['two-wheel tractor', 'hand tractor Indonesia', 'walking tractor paddy'],
  excavator: ['mini excavator', 'compact excavator digging'],
  subsoiler: ['tractor subsoiler', 'tractor plowing dry field'],
  drone: ['agricultural drone spraying', 'DJI Agras', 'drone spraying rice field'],
  brushcutter: ['brush cutter', 'string trimmer grass', 'brushcutter clearing'],
  sprayer: ['mist blower sprayer', 'power sprayer agriculture', 'knapsack sprayer plantation'],
  combine: ['combine harvester rice field', 'rice combine harvester Indonesia', 'mini combine harvester paddy'],
  thresher: ['rice thresher', 'corn thresher machine', 'power thresher'],
  pulper: ['coffee pulper', 'coffee processing machine', 'coffee cherries pulping'],
  truck: ['truck rice sacks loading', 'Isuzu truck Indonesia', 'lorry bags harvest'],
  pickup: ['pickup truck 4x4 field', 'Toyota Hilux 4x4', 'pickup truck plantation'],
  dumptruck: ['dump truck', 'tipper truck', 'dump truck quarry'],
  hero: ['rice terrace Indonesia farmer', 'Aceh rice field', 'paddy field sunrise Indonesia'],
  landingWork: ['farmer tractor Indonesia', 'rice harvest Indonesia farmer', 'Indonesian farmer field'],
  landingCoffee: ['coffee plantation Gayo', 'coffee harvest Indonesia', 'coffee farmer Indonesia'],
};

const FREE = /^(cc0|public domain|cc by|cc-by|cc by-sa|cc-by-sa)/i;

function stripHtml(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function search(term) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', `filetype:bitmap ${term}`);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '10');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|size|extmetadata');
  url.searchParams.set('iiurlwidth', '1400');
  let res;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing; contact demo@example.com)' } });
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${term}`);
  const json = await res.json();
  const pages = Object.values(json.query?.pages || {});
  return pages
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

const out = {};
for (const [key, terms] of Object.entries(QUERIES)) {
  const seen = new Set();
  const results = [];
  for (const term of terms) {
    try {
      for (const item of await search(term)) {
        if (seen.has(item.title)) continue;
        seen.add(item.title);
        results.push({ ...item, term });
      }
    } catch (error) {
      console.error(key, term, error.message);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  out[key] = results.slice(0, 16);
  console.log(key, out[key].length);
}

await writeFile(new URL('./candidates.json', import.meta.url), JSON.stringify(out, null, 2));
