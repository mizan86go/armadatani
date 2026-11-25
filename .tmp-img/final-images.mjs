import { writeFile, mkdir, rm } from 'node:fs/promises';

const FINAL = [
  ['units/unit-tr4-01-1.jpg', 'File:Rice Paddy Tractor (27732883990).jpg', 'Traktor roda empat membajak sawah basah'],
  ['units/unit-tr4-01-2.jpg', 'File:Taun-Gusi-2 Sabah Ploughing-the-rice-paddies-03.jpg', 'Traktor membajak petak sawah'],
  ['units/unit-tr4-01-3.jpg', 'File:Tractor Kubota M7030 FDT en Valencia 01.jpg', 'Traktor Kubota M7030 di lahan pertanian'],
  ['units/unit-tr2-02-1.jpg', 'File:Kubota two-wheel tractor in Thailand.jpg', 'Traktor tangan dua roda di sawah'],
  ['units/unit-tr2-02-2.jpg', 'File:Mengolah Lahan.jpg', 'Petani mengolah lahan dengan traktor tangan'],
  ['units/unit-tr4-04-1.jpg', 'File:Ford FW 30 pulling Subsoiler.jpg', 'Traktor menarik bajak subsoiler'],
  ['units/unit-tr4-04-2.jpg', 'File:Uhřice (okres Hodonín) - podmítání půdy, 2023-09, obr01.jpg', 'Pengolahan tanah lapisan dalam di lahan kering'],
  ['units/unit-exc-03-1.jpg', 'File:Case mini excavator - Arlington, MA.jpg', 'Ekskavator mini di lokasi kerja'],
  ['units/unit-exc-03-2.jpg', 'File:Excavator digging in a field during a sunny afternoon in a rural area.jpg', 'Ekskavator menggali parit di area terbuka'],
  ['units/unit-drn-05-1.jpg', 'File:IRRI BBM rice drone demo 2.jpg', 'Drone pertanian menyemprot petak sawah'],
  ['units/unit-drn-05-2.jpg', 'File:DJI 3WWDZ-10A Agras T10 (FA3XY4XTKM) (4-9-2024).jpg', 'Unit drone semprot DJI Agras T10'],
  ['units/unit-drn-05-3.jpg', 'File:Agricultural drone spraying on paddy field.jpg', 'Drone penyemprot di atas padi'],
  ['units/unit-bbt-06-1.jpg', 'File:Brush cutter 02.JPG', 'Mesin babat rumput gendong'],
  ['units/unit-bbt-06-2.jpg', 'File:Person uses a gas-powered trimmer to cut grass near a path in a green area.jpg', 'Pemakaian mesin pemotong rumput'],
  ['units/unit-spr-07-1.jpg', 'File:Knapsack sprayer.jpg', 'Unit power sprayer tipe punggung'],
  ['units/unit-spr-07-2.jpg', 'File:Spraying pesticide.jpeg', 'Penyemprotan pestisida di lahan'],
  ['units/unit-cmb-08-1.jpg', 'File:KotaBelud Sabah Rice-Harvesting-machine-01.jpg', 'Mesin panen padi bekerja di sawah'],
  ['units/unit-cmb-08-2.jpg', 'File:01-rice combine harvester.jpg', 'Combine harvester memanen padi'],
  ['units/unit-cmb-08-3.jpg', 'File:Rice Cutting Machine.jpg', 'Mesin pemotong padi di petak sawah'],
  ['units/unit-thr-09-1.jpg', 'File:Mechanized Rice Thresher.jpg', 'Mesin perontok padi mekanis'],
  ['units/unit-thr-09-2.jpg', 'File:Motorized Mobile Sheller.jpg', 'Mesin perontok jagung mobile'],
  ['units/unit-plp-10-1.jpg', 'File:Coffee pulper machine-1-keeraikkadu puthur-yercaud-salem-India.jpg', 'Mesin pulper kopi'],
  ['units/unit-plp-10-2.jpg', 'File:Coffee pulping process.JPG', 'Proses pengupasan buah kopi'],
  ['units/unit-trk-11-1.jpg', 'File:Tawau Sabah Worker-with-Isuzu-truck-01.jpg', 'Pekerja memuat hasil panen ke truk'],
  ['units/unit-trk-11-2.jpg', 'File:Hino 500 Ranger (New from Hino Motors Manufacturing Indonesia).jpg', 'Truk engkel bak terbuka'],
  ['units/unit-pkp-12-1.jpg', 'File:Toyota Hilux 2.8 Conquest 4x4 2022.jpg', 'Pikap 4x4 double cabin'],
  ['units/unit-pkp-12-2.jpg', 'File:2016 Mitsubishi Strada 4x4 GLS Sport Field Master (3).jpg', 'Pikap 4x4 dari sudut belakang'],
  ['units/unit-dmp-13-1.jpg', 'File:Customized Hino Ranger Dump Trucks For Sale in Thailand 04.jpg', 'Truk dump bak hidrolik'],
  ['units/unit-dmp-13-2.jpg', 'File:Customized Hino Ranger Dump Trucks For Sale in Thailand 01.jpg', 'Truk dump enam roda'],
  ['landing/hero.jpg', 'File:Tabanan-Regency Indonesia Rice-paddies-01.jpg', 'Sawah terasering dengan pondok tani di Indonesia'],
  ['landing/aceh.jpg', 'File:Gayo Lues rice fields.jpg', 'Sawah di dataran Gayo Lues, Aceh'],
  ['landing/harvest.jpg', 'File:Farmer harvesting rice, Kampung Rawa 2014-06-20.jpg', 'Petani memanen padi'],
  ['landing/coffee.jpg', 'File:Coffee farmer in Aceh (4874878298).jpg', 'Petani kopi di Aceh memeriksa buah kopi'],
  ['landing/tractor.jpg', 'File:Taun-Gusi-2 Sabah Ploughing-the-rice-paddies-03.jpg', 'Traktor membajak sawah'],
];

const strip = (v = '') => String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const meta = new Map();

// Batch metadata lookup (max 20 titles per request).
for (let i = 0; i < FINAL.length; i += 18) {
  const batch = FINAL.slice(i, i + 18);
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({
    action: 'query',
    format: 'json',
    titles: batch.map(([, title]) => title).join('|'),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '900',
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing)' } });
  if (!res.ok) throw new Error(`metadata HTTP ${res.status}`);
  const json = await res.json();
  for (const page of Object.values(json.query?.pages || {})) {
    const info = page.imageinfo?.[0] || {};
    meta.set(page.title, {
      thumb: info.thumburl,
      license: strip(info.extmetadata?.LicenseShortName?.value),
      author: strip(info.extmetadata?.Artist?.value).slice(0, 90),
      page: info.descriptionurl,
    });
  }
  await new Promise((r) => setTimeout(r, 600));
}

await rm(new URL('../public/images/units/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../public/images/units/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/images/landing/', import.meta.url), { recursive: true });

const credits = {};
for (const [path, title, alt] of FINAL) {
  const info = meta.get(title);
  if (!info?.thumb) {
    console.error('MISSING META', path, title);
    continue;
  }
  let res;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    res = await fetch(info.thumb, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0' } });
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
  }
  if (!res.ok) {
    console.error('FAIL', path, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(`../public/images/${path}`, import.meta.url), buf);
  credits[path] = {
    alt,
    credit: info.author || 'Wikimedia Commons',
    license: info.license,
    source: info.page,
  };
  console.log(`${path} | ${Math.round(buf.length / 1024)} kB | ${info.license}`);
  await new Promise((r) => setTimeout(r, 200));
}

await writeFile(new URL('./final-credits.json', import.meta.url), JSON.stringify(credits, null, 2));

const byUnit = {};
for (const [path] of FINAL) {
  const key = path.startsWith('units/') ? path.split('/')[1].replace(/-\d+\.jpg$/, '') : null;
  if (key) (byUnit[key] ||= []).push(path);
}

const js = `/**
 * Foto peralatan dan landing page.
 * Semua foto berasal dari Wikimedia Commons dengan lisensi bebas (CC BY / CC BY-SA /
 * CC0 / public domain), diunduh ulang ke /public/images agar tidak bergantung host luar.
 * Atribusi wajib dipertahankan sesuai lisensi masing-masing — lihat properti \`credit\`.
 */
const CREDITS = ${JSON.stringify(credits, null, 2)};

function gallery(paths) {
  return paths.map((path) => ({ src: \`/images/\${path}\`, ...CREDITS[path] }));
}

export const UNIT_IMAGES = {
${Object.entries(byUnit)
  .map(([unitId, paths]) => `  '${unitId}': gallery(${JSON.stringify(paths)}),`)
  .join('\n')}
};

export const LANDING_IMAGES = {
  hero: gallery(['landing/hero.jpg'])[0],
  aceh: gallery(['landing/aceh.jpg'])[0],
  harvest: gallery(['landing/harvest.jpg'])[0],
  coffee: gallery(['landing/coffee.jpg'])[0],
  tractor: gallery(['landing/tractor.jpg'])[0],
};

export function unitImages(unit) {
  return UNIT_IMAGES[unit?.id]?.length ? UNIT_IMAGES[unit.id] : [];
}

export function unitCover(unit) {
  return unitImages(unit)[0] || null;
}
`;
await writeFile(new URL('../src/data/images.js', import.meta.url), js);
console.log('wrote src/data/images.js');
