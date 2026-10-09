// ─────────────────────────────────────────────────────────────
// Composer son mur : 2 ou 3 œuvres assorties, accrochées dans une
// vraie pièce, avec une réduction sur l'ensemble.
// ─────────────────────────────────────────────────────────────

import { ARTWORKS, getArtwork } from "../data.js";
import { CONFIG } from "../config.js";
import { initSite, preloadImages, applyPalette, restorePalette, t, L, price, priceFor, thumb } from "../site.js";
import { artCanvas, loadRoomPhoto, drawArtsOnRoom } from "../wall.js";
import { makeCanvas } from "../art.js";

await preloadImages();
initSite();

const F = Object.fromEntries(CONFIG.formats.map((f) => [f.id, f]));
const GAP = 0.08; // espace entre deux toiles, en mètres

// Dispositions : format de chaque emplacement (de gauche à droite)
const LAYOUTS = [
  { id: "duo", slots: ["40x60", "40x60"] },
  { id: "trio", slots: ["40x60", "40x60", "40x60"] },
  { id: "center", slots: ["30x40", "60x90", "30x40"] },
];

const first = getArtwork(new URLSearchParams(location.search).get("with")) || ARTWORKS[0];
const startIdx = ARTWORKS.indexOf(first);
const state = {
  layout: LAYOUTS[0],
  room: "salon",
  active: 0,
  picks: [0, 1, 2].map((i) => ARTWORKS[(startIdx + i) % ARTWORKS.length]),
};
first ? applyPalette(first, { persist: false }) : restorePalette();

const $ = (s) => document.querySelector(s);
const stage = $("#compose-stage");
const canvas = makeCanvas(10, 10);
canvas.className = "wall-photo compose-canvas";
stage.append(canvas);
const imgs = new Map();
const imgOf = (art) => {
  if (!imgs.has(art.id)) imgs.set(art.id, artCanvas(art));
  return imgs.get(art.id);
};
let rects = [];

// Positions horizontales des toiles, centrées sur le meuble
function items() {
  const formats = state.layout.slots.map((id) => F[id]);
  const total = formats.reduce((s, f) => s + f.w / 100, 0) + GAP * (formats.length - 1);
  let x = -total / 2;
  return formats.map((f, i) => {
    const dx = x + f.w / 200;
    x += f.w / 100 + GAP;
    return { img: imgOf(state.picks[i]), format: f, dx };
  });
}

async function draw() {
  const photo = await loadRoomPhoto(state.room);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = stage.clientWidth || 600, h = stage.clientHeight || 450;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (!photo) {
    ctx.fillStyle = "#E8E4DD";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  rects = drawArtsOnRoom(ctx, canvas.width, canvas.height, photo, state.room, items()).map((r) => ({
    x: r.x / dpr, y: r.y / dpr, w: r.w / dpr, h: r.h / dpr,
  }));
  // Emplacement sélectionné
  const r = rects[state.active];
  if (r) {
    ctx.save();
    ctx.setLineDash([8 * dpr, 6 * dpr]);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6 * dpr;
    const p = 6 * dpr;
    ctx.strokeRect(r.x * dpr - p, r.y * dpr - p, r.w * dpr + 2 * p, r.h * dpr + 2 * p);
    ctx.restore();
  }
}
new ResizeObserver(() => draw()).observe(stage);

// Choisir un emplacement en touchant l'image
canvas.addEventListener("click", (e) => {
  const b = canvas.getBoundingClientRect();
  const x = e.clientX - b.left, y = e.clientY - b.top;
  const i = rects.findIndex((r) => x >= r.x - 10 && x <= r.x + r.w + 10 && y >= r.y - 10 && y <= r.y + r.h + 10);
  if (i >= 0) { state.active = i; render(); }
});

function render() {
  const n = state.layout.slots.length;
  state.active = Math.min(state.active, n - 1);
  $("#layouts").innerHTML = LAYOUTS.map((l) => `
    <button type="button" class="seg" data-layout="${l.id}" aria-pressed="${l === state.layout}">${t("compose.layout." + l.id)}</button>`).join("");
  $("#c-rooms").innerHTML = ["salon", "chambre", "bureau"].map((r) => `
    <button type="button" class="seg" data-room="${r}" aria-pressed="${r === state.room}">${t("work.rooms." + r)}</button>`).join("");
  $("#slot-label").textContent = t("compose.slot", { n: state.active + 1, total: n, size: state.layout.slots[state.active].replace("x", " × ") });
  $("#picker").innerHTML = ARTWORKS.map((a) => `
    <button type="button" class="pick" role="option" data-id="${a.id}" aria-selected="${a === state.picks[state.active]}" title="${L(a.title)}">
      <img src="${thumb(a)}" alt="${L(a.title)}" width="80" height="120" loading="lazy">
    </button>`).join("");

  // Prix : somme des œuvres, puis réduction d'ensemble
  const lines = state.layout.slots.map((fid, i) => ({ art: state.picks[i], f: F[fid] }));
  const subtotal = lines.reduce((s, l) => s + priceFor(l.art, l.f), 0);
  const rate = CONFIG.sets[n] || 0;
  const discount = Math.round(subtotal * rate);
  $("#summary").innerHTML = lines.map((l) => `
      <div class="sum-row"><dt>${L(l.art.title)} <span class="note">${l.f.w} × ${l.f.h}</span></dt><dd>${price(priceFor(l.art, l.f))}</dd></div>`).join("") + `
      <div class="sum-row"><dt>${t("compose.discount", { p: Math.round(rate * 100) })}</dt><dd>− ${price(discount)}</dd></div>
      <div class="sum-row total"><dt>${t("compose.total")}</dt><dd>${price(subtotal - discount)}</dd></div>`;
  $("#add-set").disabled = !CONFIG.shopOpen;
  draw();
}
render();
window.addEventListener("langchange", render);

$("#layouts").addEventListener("click", (e) => {
  const b = e.target.closest("[data-layout]");
  if (!b) return;
  state.layout = LAYOUTS.find((l) => l.id === b.dataset.layout);
  render();
});
$("#c-rooms").addEventListener("click", (e) => {
  const b = e.target.closest("[data-room]");
  if (!b) return;
  state.room = b.dataset.room;
  render();
});
$("#picker").addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]");
  if (!b) return;
  const art = getArtwork(b.dataset.id);
  state.picks[state.active] = art;
  applyPalette(art, { persist: false });
  // On passe automatiquement à l'emplacement suivant
  state.active = (state.active + 1) % state.layout.slots.length;
  render();
});
