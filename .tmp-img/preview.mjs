import { mkdir, writeFile } from 'node:fs/promises';

const CANDIDATES = {
  'combine-a': 'File:KotaBelud Sabah Rice-Harvesting-machine-01.jpg',
  'combine-b': 'File:Langkawi Malaysia Rice-Harvesting-04.jpg',
  'combine-c': 'File:Rice Cutting Machine.jpg',
  'dump-a': 'File:Customized Hino Ranger Dump Trucks For Sale in Thailand 04.jpg',
  'dump-b': 'File:Hino 700 Profia Dump Truck 2012 (1).jpg',
  'drone-a': 'File:IRRI BBM rice drone demo 2.jpg',
  'drone-b': 'File:DJI Agras, Agritechnica 2023, Hanover (P1160330).jpg',
  'drone-c': 'File:DJI 3WWDZ-10A Agras T10 (FA3XY4XTKM) (4-9-2024).jpg',
  'pickup-a': 'File:20181107-FPAC-PJK-3245 TONED.jpg',
  'pickup-b': 'File:Car tracks of a Toyota Hilux 4x4, on Namibia sands roads.jpg',
  'pickup-c': 'File:Toyota Hilux 2.8 Conquest 4x4 2022.jpg',
  'spray-a': 'File:Spraying the tomatoes (7871762170).jpg',
  'spray-b': 'File:Knapsack Spray(GN04753).jpg',
  'tractor-a': 'File:Taun-Gusi-2 Sabah Ploughing-the-rice-paddies-03.jpg',
};

await mkdir(new URL('./preview/', import.meta.url), { recursive: true });
for (const [key, title] of Object.entries(CANDIDATES)) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title.replace(/^File:/, ''))}?width=520`;
  const res = await fetch(url, { headers: { 'User-Agent': 'ArmadaTaniDemo/1.0 (image sourcing)' } });
  if (!res.ok) {
    console.log('FAIL', key, res.status);
    continue;
  }
  await writeFile(new URL(`./preview/${key}.jpg`, import.meta.url), Buffer.from(await res.arrayBuffer()));
  console.log('ok', key);
  await new Promise((r) => setTimeout(r, 200));
}

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#111;color:#fff;font:13px sans-serif;padding:8px}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
figure{margin:0;background:#000}img{width:100%;height:150px;object-fit:cover;display:block}
figcaption{padding:2px 3px;color:#ffd479}
</style><div class="g">${Object.keys(CANDIDATES)
  .map((k) => `<figure><img src="preview/${k}.jpg"><figcaption>${k}</figcaption></figure>`)
  .join('')}</div>`;
await writeFile(new URL('./sheets/preview.html', import.meta.url), html);
