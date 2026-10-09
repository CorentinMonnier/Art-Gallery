// ─────────────────────────────────────────────────────────────
// Fonctions communes à toutes les pages :
// en-tête, pied de page, traduction FR/EN, couleurs du site,
// vignettes des œuvres.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from "./config.js";
import { ARTWORKS, getArtwork } from "./data.js";
import { STRINGS } from "./i18n.js";
import { renderArtwork, makeCanvas, loadArtImage } from "./art.js";
import { rememberFlight } from "./fly.js";

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
// Prix d'une œuvre dans un format (supplément si édition limitée)
export const priceFor = (art, format) => format.price + (art?.limited ? CONFIG.limited.surcharge : 0);
export const minPrice = (art) => Math.min(...CONFIG.formats.map((f) => priceFor(art, f)));

// Le drop a-t-il eu lieu ?
export const dropDate = () => new Date(CONFIG.drop.date);
export const dropLive = () => Date.now() >= dropDate().getTime();
export function formatDropDate() {
  return dropDate().toLocaleDateString(lang === "fr" ? "fr-CH" : "en-GB", { day: "numeric", month: "long" });
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)));
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
// [identifiant, lien, texte, visible dans la barre sur ordinateur]
const NAV = [
  ["collection", "collection.html", "nav.collection", true],
  ["gallery", "galerie.html", "nav.gallery", true],
  ["compose", "mur.html", "nav.compose", true],
  ["how", "comment.html", "nav.how", true],
  ["about", "apropos.html", "nav.about", false],
  ["faq", "faq.html", "nav.faq", false],
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
          ${NAV.map(([id, href, key, main]) =>
            `<li${main ? "" : ' class="nav-extra"'}><a href="${href}"${id === page ? ' aria-current="page"' : ""}>${t(key)}</a></li>`).join("")}
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

// ── Couleur d'ambiance ───────────────────────────────────────
// La boutique reste sobre (gris perle). Seul un halo très discret
// derrière la toile 3D reprend la couleur de l'œuvre en cours.
// Saturation d'une couleur (0 = gris, 1 = couleur pure)
function saturation(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

// Le fond reprend les couleurs de l'œuvre : ses deux teintes les plus
// vives et sa couleur de fond, en grands halos flous derrière le verre.
export function applyPalette(art, { persist = true } = {}) {
  const vivid = [...art.colors].sort((a, b) => saturation(b) - saturation(a));
  const s = document.documentElement.style;
  s.setProperty("--c1", vivid[0]);
  s.setProperty("--c2", vivid[1] || vivid[0]);
  s.setProperty("--c3", art.ground);
  s.setProperty("--glow", vivid[0]);
  if (persist) store.set("palette", art.id, true);
}

export function restorePalette(fallbackId) {
  const art = getArtwork(store.get("palette", true)) || getArtwork(fallbackId) || ARTWORKS[0];
  applyPalette(art, { persist: false });
}

// ── Toile vivante : inclinaison 3D et reflet de lumière ─────
// Ordinateur : l'œuvre s'incline et un reflet suit la souris.
// Téléphone : le reflet suit l'inclinaison du téléphone (gyroscope).
export function enableTilt(root = document) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    root.addEventListener("pointermove", (e) => {
      const card = e.target.closest?.(".work");
      if (!card) return;
      const frame = card.querySelector(".work-frame");
      const r = frame.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `translateY(-6px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
      frame.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
      frame.style.setProperty("--my", `${(y + 0.5) * 100}%`);
    });
    root.addEventListener("pointerout", (e) => {
      const card = e.target.closest?.(".work");
      if (!card || card.contains(e.relatedTarget)) return;
      const frame = card.querySelector(".work-frame");
      frame.style.transform = "";
      frame.style.removeProperty("--mx");
      frame.style.removeProperty("--my");
    });
  } else {
    onTilt((x, y) => {
      document.documentElement.style.setProperty("--gx", x.toFixed(3));
      document.documentElement.style.setProperty("--gy", y.toFixed(3));
    });
  }
}

// Gyroscope : appelle cb(x, y) avec des valeurs entre -1 et 1.
const tiltListeners = new Set();
let tiltBound = false;
export function onTilt(cb) {
  tiltListeners.add(cb);
  if (tiltBound) return;
  tiltBound = true;
  window.addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    const x = Math.max(-1, Math.min(1, e.gamma / 30));
    const y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    tiltListeners.forEach((f) => f(x, y));
  });
}
// Sur iPhone, le gyroscope demande une autorisation, à déclencher après un geste.
let motionAsked = false;
export async function askMotion() {
  if (motionAsked) return;
  motionAsked = true;
  const D = window.DeviceOrientationEvent;
  if (D && typeof D.requestPermission === "function") {
    try { await D.requestPermission(); } catch { /* refusé : pas grave */ }
  }
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

export function badgeHTML(art) {
  if (!art.limited) return "";
  const label = dropLive()
    ? t("limited.badge", { n: CONFIG.limited.edition })
    : t("limited.soon", { date: formatDropDate() });
  return `<span class="badge">${label}</span>`;
}

export function cardHTML(art) {
  return `
    <a class="work" href="oeuvre.html?id=${art.id}" data-id="${art.id}">
      <span class="work-frame">
        ${badgeHTML(art)}
        <img src="${thumb(art)}" alt="${L(art.title)}, ${t("alt.art")}" width="480" height="720" loading="lazy" decoding="async">
      </span>
      <span class="cartel">
        <span class="cartel-title">${L(art.title)}</span>
        <span class="cartel-meta">${t("card.technique")}</span>
        <span class="cartel-price">${t("card.from")} ${price(minPrice(art))}</span>
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
  enableTilt();
  // Toile qui vole : on retient la position de la vignette cliquée
  document.addEventListener("click", (e) => {
    const card = e.target.closest?.("a.work[data-id]");
    if (!card) return;
    const img = card.querySelector("img");
    if (img) rememberFlight(card.dataset.id, img.getBoundingClientRect());
  });
}
