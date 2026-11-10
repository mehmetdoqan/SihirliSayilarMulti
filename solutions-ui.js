/* Sihirli Sayılar — Çözüm Atlası ve İpucu.
   solutions.js (node tools/solve.js ile üretilir) içindeki 1.576 çözümü kullanır. */
(() => {
  "use strict";
  const DATA = window.SIHIRLI_SOLUTIONS;
  const game = window.SihirliSayiGame;
  if (!DATA || !game) return;

  const $ = s => document.querySelector(s);
  const LETTER_TO_NAME = { Z: "Z", K: "Kare", P: "P", T: "T", I: "I", L: "L" };
  const LABELS = [...Array(25).keys()].map(i => i === 12 ? "center" : String(i < 12 ? i + 1 : i));
  const ALL = LABELS.flatMap(l => DATA.byEmpty[l]);
  const MAX = Math.max(...LABELS.map(l => DATA.byEmpty[l].length));
  const MIN = Math.min(...LABELS.map(l => DATA.byEmpty[l].length));
  const pretty = l => l === "center" ? "Merkez" : l;

  // "ZZ.KK…" → {Z:[0,1], Kare:[3,4], …}
  function parse(grid) {
    const out = {};
    for (let i = 0; i < 25; i++) {
      const n = LETTER_TO_NAME[grid[i]];
      if (n) (out[n] = out[n] || []).push(i);
    }
    return out;
  }
  function matches(grid, placed) {
    for (const [name, idx] of Object.entries(placed)) {
      const letter = name === "Kare" ? "K" : name;
      for (const i of idx) if (grid[i] !== letter) return false;
    }
    return true;
  }
  function difficulty(label) {
    if (!label || !DATA.byEmpty[label]) return null;
    const count = DATA.byEmpty[label].length;
    const name = count <= 35 ? "Zor" : count <= 60 ? "Orta" : "Kolay";
    return { count, label: name };
  }
  function heatColor(count) {
    if (!count) return "#f0f2f6";
    const t = (count - MIN) / Math.max(1, MAX - MIN);
    return `hsl(${Math.round(12 + t * 128)} 72% 86%)`;
  }
  function miniBoard(grid, big) {
    const el = document.createElement("div");
    el.className = "mini" + (big ? " atlas-big" : "");
    for (let i = 0; i < 25; i++) {
      const c = document.createElement("div");
      const n = LETTER_TO_NAME[grid[i]];
      if (n) c.style.background = game.colors[n]; else c.className = "e";
      el.appendChild(c);
    }
    return el;
  }

  // ---------- İpucu ----------
  let hintsUsed = 0;
  function hint() {
    if (game.solutionsLocked) {
      game.message("Çok oyunculu tur sürerken ipucu kapalıdır.", "error");
      return;
    }
    const target = game.challengeTarget();
    const pool = target ? DATA.byEmpty[target] : ALL;
    const placed = game.getPlaced();
    const consistent = pool.filter(g => matches(g, placed));
    const goal = target ? `hedef ${target} için ` : "";

    if (!consistent.length) {
      // Hangi parçayı kaldırınca çözüm yolu açılıyor?
      const names = Object.keys(placed);
      let best = null, bestCount = 0;
      for (const n of names) {
        const rest = { ...placed }; delete rest[n];
        const c = pool.filter(g => matches(g, rest)).length;
        if (c > bestCount) { best = n; bestCount = c; }
      }
      if (best) {
        game.removePiece(best);
        hintsUsed++;
        game.message(`💡 Bu dizilişle ${goal}çözüm yoktu. ${best} parçasını geri aldım; şimdi ${bestCount} çözüm mümkün.`, "error");
      } else {
        game.message(`💡 Mevcut dizilişle ${goal}çözüm yok. Birkaç parçayı kaldırıp yeniden dene (⟲ Sıfırla da işe yarar).`, "error");
      }
      return;
    }

    const unplaced = game.names.filter(n => !placed[n]);
    if (!unplaced.length) {
      game.message("Tüm parçalar doğru yerde! Şimdi boş kalan hücrenin numarasını seç.", "success");
      return;
    }
    // En az seçeneği olan (en "zorunlu") parçayı, en sık görülen konumuna koy.
    let pick = null;
    for (const n of unplaced) {
      const freq = new Map();
      for (const g of consistent) {
        const key = parse(g)[n].join(",");
        freq.set(key, (freq.get(key) || 0) + 1);
      }
      const [key, count] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!pick || freq.size < pick.options || (freq.size === pick.options && count > pick.count)) {
        pick = { name: n, idx: key.split(",").map(Number), options: freq.size, count };
      }
    }
    game.placeFromIndices({ [pick.name]: pick.idx });
    hintsUsed++;
    const after = pool.filter(g => matches(g, game.getPlaced())).length;
    game.message(`💡 ${pick.name} parçasını yerleştirdim. Bu dizilişle ${goal}${after} çözüm hâlâ mümkün. (Kullanılan ipucu: ${hintsUsed})`, "success");
  }

  // ---------- Atlas ----------
  const modal = $("#atlasModal"), body = $("#atlasBody");
  const state = { target: "1", index: 0, onlyMine: false, gallery: false };

  function list(label) {
    const all = DATA.byEmpty[label] || [];
    if (!state.onlyMine) return all;
    const placed = game.getPlaced();
    return all.filter(g => matches(g, placed));
  }

  function render() {
    body.replaceChildren();
    if (game.solutionsLocked) {
      body.innerHTML = `<div class="atlas-lock"><div class="big">🔒</div><p><b>Tur sürerken çözümler kilitli.</b><br>Turu tamamladığında ya da süre dolduğunda tüm çözümleri burada görebilirsin.</p></div>`;
      return;
    }
    const hardest = LABELS.filter(l => DATA.byEmpty[l].length === MIN).map(pretty).join(", ");
    const summary = document.createElement("div");
    summary.className = "atlas-summary";
    summary.innerHTML =
      `<span class="atlas-chip"><b>${DATA.total.toLocaleString("tr-TR")}</b> çözüm</span>` +
      `<span class="atlas-chip"><b>${DATA.symmetryClasses}</b> farklı desen (döndürme/aynalama hariç)</span>` +
      `<span class="atlas-chip"><b>25/25</b> hedef çözülebilir</span>` +
      `<span class="atlas-chip">En zor: <b>${hardest}</b> (${MIN} çözüm)</span>`;
    body.appendChild(summary);

    const layout = document.createElement("div");
    layout.className = "atlas-layout";

    // Sol: ısı haritası
    const left = document.createElement("div");
    left.innerHTML = `<div class="hint" style="margin-bottom:8px;text-align:center">Bir hücre seç: o hücreyi boş bırakan tüm çözümler listelenir.</div>`;
    const heat = document.createElement("div");
    heat.className = "atlas-heat";
    LABELS.forEach(l => {
      const n = list(l).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "heat-cell" + (l === state.target ? " active" : "") + (n ? "" : " none");
      b.style.background = heatColor(n);
      b.innerHTML = `<strong>${l === "center" ? "❖" : l}</strong><small>${n}</small>`;
      b.title = `${pretty(l)}: ${n} çözüm`;
      b.onclick = () => { state.target = l; state.index = 0; render(); };
      heat.appendChild(b);
    });
    left.appendChild(heat);
    left.insertAdjacentHTML("beforeend",
      `<div class="heat-legend"><span><i style="background:${heatColor(MAX)}"></i>Kolay</span><span><i style="background:${heatColor((MIN + MAX) / 2)}"></i>Orta</span><span><i style="background:${heatColor(MIN)}"></i>Zor</span></div>`);
    layout.appendChild(left);

    // Sağ: çözüm görüntüleyici
    const right = document.createElement("div");
    right.className = "atlas-viewer";
    const items = list(state.target);
    if (state.index >= items.length) state.index = Math.max(0, items.length - 1);
    const d = difficulty(state.target);
    right.insertAdjacentHTML("beforeend",
      `<div class="atlas-title">Boş hücre: ${pretty(state.target)} · ${items.length} çözüm${state.onlyMine ? ` (toplam ${d.count})` : ""} · ${d.label}</div>`);

    const opts = document.createElement("div");
    opts.className = "atlas-opts";
    const placedCount = Object.keys(game.getPlaced()).length;
    opts.innerHTML = `<label><input type="checkbox" id="atlasMine"${state.onlyMine ? " checked" : ""}${placedCount ? "" : " disabled"}> Sadece tahtamdaki parçalara uyanlar${placedCount ? ` (${placedCount} parça)` : ""}</label>`;
    right.appendChild(opts);
    opts.querySelector("#atlasMine").onchange = e => { state.onlyMine = e.target.checked; state.index = 0; render(); };

    if (!items.length) {
      right.insertAdjacentHTML("beforeend", `<div class="notice error">Tahtandaki parçalarla bu hücreyi boş bırakan çözüm yok. Filtreyi kapat veya başka bir hücre seç.</div>`);
    } else {
      const nav = document.createElement("div");
      nav.className = "atlas-nav";
      nav.innerHTML = `<button class="btn" id="atlasPrev" aria-label="Önceki">◀</button><span class="atlas-pos">${state.index + 1} / ${items.length}</span><button class="btn" id="atlasNext" aria-label="Sonraki">▶</button>`;
      right.appendChild(nav);
      nav.querySelector("#atlasPrev").onclick = () => step(-1);
      nav.querySelector("#atlasNext").onclick = () => step(1);
      right.appendChild(miniBoard(items[state.index], true));

      const actions = document.createElement("div");
      actions.className = "atlas-nav";
      actions.innerHTML = `<button class="btn primary" id="atlasApply">Tahtaya uygula</button><button class="btn" id="atlasRandom">🎲 Rastgele</button><button class="btn" id="atlasGallery">${state.gallery ? "Galeriyi gizle" : "Galeri"}</button>`;
      right.appendChild(actions);
      actions.querySelector("#atlasApply").onclick = () => {
        game.placeFromIndices(parse(items[state.index]), { replace: true });
        close();
        game.message(`Çözüm ${state.index + 1}/${items.length} tahtaya uygulandı (boş hücre: ${pretty(state.target)}). ↶ Geri al ile önceki tahtana dönebilirsin.`, "success");
      };
      actions.querySelector("#atlasRandom").onclick = () => { state.index = Math.floor(Math.random() * items.length); render(); };
      actions.querySelector("#atlasGallery").onclick = () => { state.gallery = !state.gallery; render(); };

      if (state.gallery) {
        const gal = document.createElement("div");
        gal.className = "atlas-gallery";
        items.forEach((g, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.title = `Çözüm ${i + 1}`;
          if (i === state.index) b.className = "active";
          b.appendChild(miniBoard(g, false));
          b.onclick = () => { state.index = i; render(); };
          gal.appendChild(b);
        });
        right.appendChild(gal);
        requestAnimationFrame(() => gal.querySelector(".active")?.scrollIntoView({ block: "nearest" }));
      }
    }
    layout.appendChild(right);
    body.appendChild(layout);
  }

  function step(d) {
    const n = list(state.target).length;
    if (!n) return;
    state.index = (state.index + d + n) % n;
    render();
  }
  function open(target) {
    if (target && DATA.byEmpty[target]) { state.target = target; state.index = 0; }
    else if (game.challengeTarget()) { state.target = game.challengeTarget(); state.index = 0; }
    render();
    modal.classList.add("show");
  }
  function close() { modal.classList.remove("show"); }

  $("#openAtlas").addEventListener("click", () => open());
  $("#closeAtlas").addEventListener("click", close);
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  $("#hint").addEventListener("click", hint);
  document.addEventListener("keydown", e => {
    if (!modal.classList.contains("show")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  window.SihirliAtlas = { open, close, hint, difficulty, refresh: () => modal.classList.contains("show") && render() };
})();
