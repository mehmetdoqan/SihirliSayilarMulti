// Sihirli Sayılar — tüm çözümleri hesaplar ve solutions.js dosyasını üretir.
// Kullanım: node tools/solve.js
"use strict";
const fs = require("fs");
const path = require("path");

const ORDER = ["Z", "Kare", "P", "T", "I", "L"];
const INITIAL = {
  Z: [[0,0],[0,1],[1,1],[1,2]], Kare: [[0,0],[0,1],[1,0],[1,1]],
  P: [[0,0],[0,1],[1,0],[1,1],[2,0]], T: [[0,0],[0,1],[0,2],[1,1]],
  I: [[0,0],[1,0],[2,0]], L: [[0,0],[1,0],[2,0],[2,1]]
};
const normalize = c => {
  const mr = Math.min(...c.map(p => p[0])), mc = Math.min(...c.map(p => p[1]));
  return c.map(([r, x]) => [r - mr, x - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rotate = c => normalize(c.map(([r, x]) => [x, -r]));
const flip = c => normalize(c.map(([r, x]) => [r, -x]));

function orientations(cells) {
  const out = new Map();
  let c = normalize(cells);
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 4; i++) { out.set(JSON.stringify(c), c); c = rotate(c); }
    c = flip(c);
  }
  return [...out.values()];
}

// Her parçanın tüm yerleşimleri: {mask, cells, anchor}
const placements = {};
for (const name of ORDER) {
  placements[name] = [];
  for (const cells of orientations(INITIAL[name])) {
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      let mask = 0, ok = true;
      for (const [dr, dc] of cells) {
        const rr = r + dr, cc = c + dc;
        if (rr > 4 || cc > 4) { ok = false; break; }
        mask |= 1 << (rr * 5 + cc);
      }
      if (ok) placements[name].push({ mask, cells, anchor: { r, c } });
    }
  }
}

const FULL = (1 << 25) - 1;
const solutions = []; // her çözüm: {empty, grid: "25 harf"}
const LETTER = { Z: "Z", Kare: "K", P: "P", T: "T", I: "I", L: "L" };

function search(i, used, chosen) {
  if (i === ORDER.length) {
    const emptyMask = FULL & ~used;
    const empty = Math.log2(emptyMask);
    const grid = Array(25).fill(".");
    chosen.forEach((pl, k) => {
      for (let b = 0; b < 25; b++) if (pl.mask & (1 << b)) grid[b] = LETTER[ORDER[k]];
    });
    solutions.push({ empty, grid: grid.join("") });
    return;
  }
  for (const pl of placements[ORDER[i]]) {
    if (pl.mask & used) continue;
    chosen.push(pl); search(i + 1, used | pl.mask, chosen); chosen.pop();
  }
}
search(0, 0, []);

// Simetri sınıfları (tahtanın 8 simetrisi altında aynı olanlar)
const sym = [
  (r, c) => [r, c], (r, c) => [c, 4 - r], (r, c) => [4 - r, 4 - c], (r, c) => [4 - c, r],
  (r, c) => [r, 4 - c], (r, c) => [4 - r, c], (r, c) => [c, r], (r, c) => [4 - c, 4 - r]
];
function canon(grid) {
  let best = null;
  for (const f of sym) {
    const g = Array(25);
    for (let i = 0; i < 25; i++) { const [r, c] = f(Math.floor(i / 5), i % 5); g[r * 5 + c] = grid[i]; }
    const s = g.join(""); if (best === null || s < best) best = s;
  }
  return best;
}
const label = e => e === 12 ? "center" : String(e < 12 ? e + 1 : e);
const byEmpty = {};
for (let e = 0; e < 25; e++) byEmpty[label(e)] = [];
const classes = new Set();
for (const s of solutions) { byEmpty[label(s.empty)].push(s.grid); classes.add(canon(s.grid)); }
for (const k in byEmpty) byEmpty[k].sort();

const counts = Object.fromEntries(Object.entries(byEmpty).map(([k, v]) => [k, v.length]));
console.log("Toplam çözüm:", solutions.length, "· Simetri sınıfı:", classes.size);
console.log(counts);

const out = `/* OTOMATİK ÜRETİLDİ — node tools/solve.js
   Sihirli Sayılar: 6 parçanın (döndürme ve aynalama serbest) 5×5 tahtadaki tüm yerleşimleri.
   Her çözüm 25 harflik bir dizedir (satır satır): Z, K(are), P, T, I, L; "." boş hücre.
   Anahtar: boş kalan hücrenin numarası (1–24) ya da "center". */
window.SIHIRLI_SOLUTIONS = ${JSON.stringify({ total: solutions.length, symmetryClasses: classes.size, byEmpty })};
`;
fs.writeFileSync(path.join(__dirname, "..", "solutions.js"), out);
console.log("solutions.js yazıldı:", out.length, "bayt");
