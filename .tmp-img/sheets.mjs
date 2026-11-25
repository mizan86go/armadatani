import { readFile, writeFile, mkdir } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('./candidates.json', import.meta.url), 'utf8'));
const keys = Object.keys(data);
const PER_SHEET = 3;
await mkdir(new URL('./sheets', import.meta.url), { recursive: true });

let sheet = 0;
for (let i = 0; i < keys.length; i += PER_SHEET) {
  const group = keys.slice(i, i + PER_SHEET);
  const rows = Math.max(...group.map((k) => Math.ceil(data[k].length / 4)));
  const height = group.length * 34 + rows * 190 + 40;
  const blocks = group
    .map(
      (key) => `<h2>${key}</h2><div class="grid">${data[key]
        .map(
          (item, idx) =>
            `<figure><span>${key}#${idx}</span><img src="${item.thumb}" loading="eager"><figcaption>${item.title
              .replace('File:', '')
              .slice(0, 52)}</figcaption></figure>`,
        )
        .join('')}</div>`,
    )
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#111;color:#fff;font:12px/1.25 sans-serif;padding:12px}
  h2{font-size:15px;margin:10px 0 6px;color:#ffd479}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  figure{margin:0;position:relative;background:#000;border-radius:4px;overflow:hidden}
  figure span{position:absolute;top:0;left:0;background:#ffd479;color:#000;font-weight:700;padding:1px 4px;z-index:2}
  img{width:100%;height:130px;object-fit:cover;display:block}
  figcaption{font-size:10px;color:#bbb;padding:2px 3px;height:26px;overflow:hidden}
  </style>${blocks}`;
  const file = new URL(`./sheets/sheet-${sheet}.html`, import.meta.url);
  await writeFile(file, html);
  console.log(`sheet-${sheet}: ${group.join(',')} height=${height}`);
  sheet += 1;
}
