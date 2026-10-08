// ─────────────────────────────────────────────────────────────
// Fonctions communes à toutes les pages :
// en-tête, pied de page, traduction FR/EN, couleurs du site,
// vignettes des œuvres.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from "./config.js";
import { ARTWORKS, getArtwork } from "./data.js";
import { STRINGS } from "./i18n.js";
import { renderArtwork, makeCanvas, loadArtImage } from "./art.js";

// Le stockage du navigateur peut être bloqué : on l'utilise avec prudence.
const store = {
  get(k, session = false) {
    try { return (session ? sessionStorage : localStorage).getItem(k); } catch { return null; }
  },
  set(k, v, session = false) {
    try { (session ? sessionStorage : localStorage).setItem(k, v); } catch { /* ignoré */ }
  },
};

// ── Langue ───────────────────────────────────────────────────
const saved = store.get("lang");
export let lang = saved === "fr" || saved === "en"
  ? saved
  : ((navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en");

export function t(key, vars) {
  let s = STRINGS[lang][key] ?? STRINGS.fr[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
export const L = (obj) => (obj ? obj[lang] ?? obj.fr : "");

export function price(n) {
  return lang === "fr" ? `${n} ${CONFIG.currency}` : `${CONFIG.currency} ${n}`;
}
export const minPrice = () => Math.min(...CONFIG.formats.map((f) => f.price));

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  root.querySelectorAll("[data-lang]").forEach((el) => (el.hidden = el.dataset.lang !== lang));
  const key = document.body.dataset.title;
  if (key) {
    document.title = document.body.dataset.page === "home"
      ? `${CONFIG.brand} | ${t(key)}`
      : `${t(key)} | ${CONFIG.brand}`;
  }
}

export function setLang(l) {
  lang = l;
  store.set("lang", l);
  applyI18n();
  renderHeader();
  renderFooter();
  window.dispatchEvent(new CustomEvent("langchange"));
}

// ── En-tête et pied de page ──────────────────────────────────
const NAV = [
  ["collection", "collection.html", "nav.collection"],
  ["how", "comment.html", "nav.how"],
  ["about", "apropos.html", "nav.about"],
  ["faq", "faq.html", "nav.faq"],
];

export function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  const page = document.body.dataset.page;
  el.innerHTML = `
    <div class="wrap bar">
      <a class="brand" href="index.html">${CONFIG.brand}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav">${t("nav.menu")}</button>
      <nav id="main-nav" class="nav" aria-label="${t("nav.label")}">
        <ul>
          ${NAV.map(([id, href, key]) =>
            `<li><a href="${href}"${id === page ? ' aria-current="page"' : ""}>${t(key)}</a></li>`).join("")}
        </ul>
        <button class="lang-btn" type="button" aria-label="${t("lang.switch")}">${lang === "fr" ? "EN" : "FR"}</button>
      </nav>
    </div>`;
  const btn = el.querySelector(".menu-btn");
  const nav = el.querySelector(".nav");
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  el.querySelector(".lang-btn").addEventListener("click", () => setLang(lang === "fr" ? "en" : "fr"));
}

export function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  const s = CONFIG.socials;
  el.innerHTML = `
    <div class="wrap foot">
      <div class="foot-brand">
        <span class="brand">${CONFIG.brand}</span>
        <p>${t("footer.tag")}</p>
        <p class="foot-note">${t("footer.proto")}</p>
      </div>
      <div>
        <h2 class="foot-h">${t("footer.links")}</h2>
        <ul class="foot-list">
          ${NAV.map(([, href, key]) => `<li><a href="${href}">${t(key)}</a></li>`).join("")}
        </ul>
      </div>
      <div>
        <h2 class="foot-h">${t("footer.follow")}</h2>
        <ul class="foot-list">
          <li><a href="${s.instagram}">Instagram</a></li>
          <li><a href="${s.tiktok}">TikTok</a></li>
          <li><a href="${s.youtube}">YouTube</a></li>
        </ul>
      </div>
      <p class="foot-copy">© 2026 ${CONFIG.brand}</p>
    </div>`;
}

// ── Couleurs : le site prend les couleurs de l'œuvre regardée ──
function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function lum(hex) {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const DARK = "#17131C";
const LIGHT = "#FFF8F0";

export function paletteFor(art) {
  const ground = art.ground;
  const ink = contrast(ground, DARK) >= contrast(ground, LIGHT) ? DARK : LIGHT;
  const accent = [...art.colors].sort((a, b) => contrast(b, ground) - contrast(a, ground))[0];
  const accentInk = contrast(accent, DARK) >= contrast(accent, LIGHT) ? DARK : LIGHT;
  return { ground, ink, accent, accentInk };
}

export function applyPalette(art, { persist = true } = {}) {
  const p = paletteFor(art);
  const s = document.documentElement.style;
  s.setProperty("--ground", p.ground);
  s.setProperty("--ink", p.ink);
  s.setProperty("--accent", p.accent);
  s.setProperty("--accent-ink", p.accentInk);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", p.ground);
  if (persist) store.set("palette", art.id, true);
}

export function restorePalette(fallbackId) {
  const art = getArtwork(store.get("palette", true)) || getArtwork(fallbackId) || ARTWORKS[0];
  applyPalette(art, { persist: false });
}

// ── Vignettes ────────────────────────────────────────────────
const thumbs = new Map();
export function thumb(art) {
  if (art.image) return art.image;
  if (!thumbs.has(art.id)) {
    const c = makeCanvas(480, 720);
    renderArtwork(c.getContext("2d"), art, 480);
    thumbs.set(art.id, c.toDataURL("image/jpeg", 0.88));
  }
  return thumbs.get(art.id);
}

export function cardHTML(art) {
  return `
    <a class="work" href="oeuvre.html?id=${art.id}">
      <span class="work-frame">
        <img src="${thumb(art)}" alt="${L(art.title)}, ${t("alt.art")}" width="480" height="720" loading="lazy" decoding="async">
      </span>
      <span class="cartel">
        <span class="cartel-title">${L(art.title)}</span>
        <span class="cartel-meta">${t("card.technique")}</span>
        <span class="cartel-price">${t("card.from")} ${price(minPrice())}</span>
      </span>
    </a>`;
}

export function preloadImages() {
  return Promise.all(ARTWORKS.map(loadArtImage));
}

export function initSite() {
  renderHeader();
  renderFooter();
  applyI18n();
}
