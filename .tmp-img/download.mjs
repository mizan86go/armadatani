import { readFile, mkdir, writeFile } from 'node:fs/promises';

const c1 = JSON.parse(await readFile(new URL('./candidates.json', import.meta.url), 'utf8'));
const c2 = JSON.parse(await readFile(new URL('./candidates2.json', import.meta.url), 'utf8'));

const PICKS = [
  ['unit-tr4-01', 1, c1.tractor4[2], 'Traktor roda empat membajak sawah'],
  ['unit-tr4-01', 2, c1.tractor4[10], 'Traktor Kubota M7030 di lahan pertanian'],
  ['unit-tr2-02', 1, c1.handtractor[1], 'Traktor tangan dua roda di sawah'],
  ['unit-tr2-02', 2, c1.handtractor[15], 'Petani mengolah lahan dengan traktor tangan'],
  ['unit-tr4-04', 1, c1.subsoiler[3], 'Traktor menarik bajak subsoiler'],
  ['unit-tr4-04', 2, c1.subsoiler[9], 'Pengolahan tanah lapisan dalam di lahan kering'],
  ['unit-exc-03', 1, c1.excavator[3], 'Ekskavator mini di lokasi kerja'],
  ['unit-exc-03', 2, c1.excavator[10], 'Ekskavator menggali parit di area terbuka'],
  ['unit-drn-05', 1, c1.drone[8], 'Drone pertanian menyemprot sawah'],
  ['unit-drn-05', 2, c1.drone[12], 'Drone penyemprot di atas padi'],
  ['unit-bbt-06', 1, c1.brushcutter[1], 'Mesin babat rumput gendong'],
  ['unit-bbt-06', 2, c1.brushcutter[14], 'Pemakaian mesin pemotong rumput'],
  ['unit-spr-07', 1, c2.sprayer2[3], 'Mesin semprot punggung bermotor'],
  ['unit-spr-07', 2, c2.sprayer2[9], 'Unit power sprayer tipe punggung'],
  ['unit-spr-07', 3, c2.sprayer2[15], 'Penyemprotan pestisida di lahan'],
  ['unit-cmb-08', 1, c1.combine[5], 'Combine harvester memanen padi'],
  ['unit-cmb-08', 2, c1.combine[8], 'Mesin panen padi di petak sawah'],
  ['unit-thr-09', 1, c1.thresher[0], 'Mesin perontok padi mekanis'],
  ['unit-thr-09', 2, c2.thresherCorn[4], 'Mesin perontok jagung mobile'],
  ['unit-plp-10', 1, c1.pulper[7], 'Mesin pulper kopi'],
  ['unit-plp-10', 2, c1.pulper[5], 'Proses pengupasan buah kopi'],
  ['unit-trk-11', 1, c1.truck[3], 'Pekerja memuat hasil panen ke truk'],
  ['unit-trk-11', 2, c2.truck[2], 'Truk engkel bak terbuka'],
  ['unit-pkp-12', 1, c1.pickup[2], 'Pikap 4x4 double cabin'],
  ['unit-pkp-12', 2, c1.pickup[3], 'Pikap 4x4 dari sudut belakang'],
  ['unit-dmp-13', 1, c2.dumptruck[1], 'Truk dump bak hidrolik'],
  ['unit-dmp-13', 2, c2.dumptruck[3], 'Truk dump enam roda'],
  ['landing-hero', 1, c1.hero[0], 'Sawah berteras di Indonesia'],
  ['landing-aceh', 1, c1.hero[13], 'Sawah di dataran Gayo Lues, Aceh'],
  ['landing-harvest', 1, c1.landingWork[12], 'Petani memanen padi'],
  ['landing-coffee', 1, c1.landingCoffee[12], 'Petani kopi di Aceh'],
];

await mkdir(new URL('../public/images/units/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/images/landing/', import.meta.url), { recursive: true });

const credits = [];
for (const [key, n, item, alt] of PICKS) {
  if (!item) {
    console.error('MISSING', key, n);
    continue;
  }
  const isLanding = key.startsWith('landing-');
  const fileTitle = item.title.replace(/^File:/, '');
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileTitle)}?width=1000`;
  const rel = isLanding ? `landing/${key}.jpg` : `units/${key}-${n}.jpg`;
  const dest = new URL(`../public/images/${rel}`, import.meta.url);
  let res;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    res = await fetch(url, {
      headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing)', Referer: 'https://commons.wikimedia.org/' },
      redirect: 'follow',
    });
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  if (!res.ok) {
    console.error('FAIL', rel, res.status, url);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  credits.push({
    file: rel,
    alt,
    title: item.title.replace('File:', ''),
    author: item.artist,
    license: item.license,
    source: item.page,
    bytes: buf.length,
  });
  console.log(`${rel} | ${Math.round(buf.length / 1024)} kB | ${item.license} | ${item.title.replace('File:', '')}`);
  await new Promise((r) => setTimeout(r, 250));
}
await writeFile(new URL('./credits.json', import.meta.url), JSON.stringify(credits, null, 2));
