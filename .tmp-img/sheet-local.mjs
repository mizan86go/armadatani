import { readFile, writeFile, readdir } from 'node:fs/promises';

const files = (await readdir(new URL('../public/images/units/', import.meta.url))).sort();
const landing = (await readdir(new URL('../public/images/landing/', import.meta.url))).sort();
const all = [
  ...files.map((f) => ({ label: f.replace('.jpg', ''), path: `../../public/images/units/${f}` })),
  ...landing.map((f) => ({ label: f.replace('.jpg', ''), path: `../../public/images/landing/${f}` })),
];

const chunk = Math.ceil(all.length / 2);
for (let s = 0; s < 2; s += 1) {
  const rows = all.slice(s * chunk, (s + 1) * chunk);
  const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#111;color:#fff;font:12px/1.3 sans-serif;padding:10px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  figure{margin:0;background:#000;border-radius:4px;overflow:hidden}
  img{width:100%;height:170px;object-fit:cover;display:block}
  figcaption{font-size:11px;color:#ffd479;padding:3px 4px}
  </style><div class="grid">${rows
    .map(
      (r) =>
        `<figure><img src="${r.path}"><figcaption>${r.label}</figcaption></figure>`,
    )
    .join('')}</div>`;
  await writeFile(new URL(`./sheets/local-${s}.html`, import.meta.url), html);
  console.log(`local-${s}: ${rows.length} images`);
}
