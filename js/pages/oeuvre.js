import { ARTWORKS, getArtwork } from "../data.js";
import { CONFIG } from "../config.js";
import {
  initSite, cardHTML, preloadImages, applyPalette, restorePalette, t, L, price, priceFor,
  thumb, dropLive, formatDropDate,
} from "../site.js";
import { mountWall, WALL_COLORS, artCanvas } from "../wall.js";
import { playFlight } from "../fly.js";

await preloadImages();
const id = new URLSearchParams(location.search).get("id");
const art = getArtwork(id);
const main = document.getElementById("work-main");

if (!art) {
  restorePalette();
  initSite();
  main.innerHTML = `<section class="wrap notfound">
    <p>${t("work.notfound")}</p>
    <a class="btn" href="collection.html">${t("work.back")}</a></section>`;
} else {
  applyPalette(art);
  initSite();

  const state = { room: "salon", format: CONFIG.formats[1], wallColor: "auto" };
  const $ = (s) => document.querySelector(s);
  let wall = null;

  // ── Textes, tailles, prix ──────────────────────────────────
  const renderText = () => {
    document.title = `${L(art.title)} | ${CONFIG.brand}`;
    $("#work-title").textContent = L(art.title);
    $("#work-text").textContent = L(art.text);
    $("#work-scale").textContent = t("work.scale", { w: state.format.w, h: state.format.h });
    $("#work-price").textContent = price(priceFor(art, state.format));
    $("#sizes").innerHTML = CONFIG.formats.map((f) => `
      <label class="choice">
        <input type="radio" name="size" id="size-${f.id}" value="${f.id}"${f.id === state.format.id ? " checked" : ""}>
        <span>${f.w} × ${f.h} cm</span>
        <span class="choice-price">${price(priceFor(art, f))}</span>
      </label>`).join("");
    $("#rooms").innerHTML = ["salon", "chambre", "bureau"].map((r) => `
      <button type="button" class="seg" data-room="${r}" aria-pressed="${r === state.room}">${t("work.rooms." + r)}</button>`).join("");
    $("#swatches").innerHTML = WALL_COLORS.map((c) => `
      <button type="button" class="swatch" data-color="${c.id}" aria-pressed="${c.id === state.wallColor}"
        aria-label="${t("wall." + c.id)}" title="${t("wall." + c.id)}"
        style="--sw:${c.hex || "conic-gradient(#E8E4DD 0 33%, #DCE0E3 0 66%, #E4DFD3 0)"}"></button>`).join("");
    // Édition limitée
    const box = $("#limited-box");
    box.hidden = !art.limited;
    if (art.limited) {
      box.innerHTML = `<strong>${t("limited.title", { n: CONFIG.limited.edition })}</strong>
        <span>${t("limited.text")}</span>
        ${dropLive() ? "" : `<a href="index.html#drop">${t("limited.release", { date: formatDropDate() })}</a>`}`;
    }
    $("#compose-link").href = `mur.html?with=${art.id}`;
    const others = ARTWORKS.filter((a) => a.id !== art.id);
    const start = ARTWORKS.indexOf(art) % others.length;
    $("#more").innerHTML = [0, 1, 2].map((i) => cardHTML(others[(start + i) % others.length])).join("");
    if (wall) syncView(wall.view);
  };
  renderText();
  window.addEventListener("langchange", renderText);

  const add = $("#add-to-cart");
  add.disabled = !CONFIG.shopOpen;
  // Plus tard : ce bouton enverra art.shopifyHandle + state.format.id au panier Shopify.
  add.dataset.handle = art.shopifyHandle || "";

  // ── Vues Photo / 3D / Chez moi ─────────────────────────────
  const hints = { photo: "work.hint.photo", "3d": "work.drag", home: "home.tool.hint" };
  async function syncView(view) {
    if (!wall) return;
    document.querySelectorAll("#views .seg").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    $("#wall-hint").textContent = t(hints[view]);
    $("#tools-home").hidden = view !== "home";
    $("#tools-3d").hidden = view !== "3d";
    $("#rooms").hidden = view === "home";
    const photoBtn = document.querySelector('#views [data-view="photo"]');
    photoBtn.hidden = !(await wall.hasPhoto(state.room));
    if (view === "home") $("#home-scale").value = wall.homeScale;
  }

  wall = await mountWall($("#wall-stage"), art, { room: state.room, format: state.format, onView: (v) => syncView(v) });
  syncView(wall.view);

  // La toile qui vole depuis la page précédente
  playFlight(art.id, thumb(art), wall.artRect());

  const fileInput = $("#home-file");
  $("#views").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    if (b.dataset.view === "home" && !wall.hasHome) return fileInput.click();
    await wall.setView(b.dataset.view);
  });
  $("#home-change").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    try { await wall.setHomePhoto(file); }
    catch { $("#wall-hint").textContent = t("home.tool.error"); }
  });
  $("#home-scale").addEventListener("input", (e) => wall.setHomeScale(Number(e.target.value)));
  $("#home-save").addEventListener("click", async () => {
    const blob = await wall.snapshot();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${art.id}-chez-moi.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

  $("#swatches").addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if (!b) return;
    state.wallColor = b.dataset.color;
    document.querySelectorAll("#swatches .swatch").forEach((s) => s.setAttribute("aria-pressed", String(s === b)));
    wall.setWallColor(WALL_COLORS.find((c) => c.id === state.wallColor).hex);
  });

  $("#sizes").addEventListener("change", (e) => {
    state.format = CONFIG.formats.find((f) => f.id === e.target.value);
    $("#work-price").textContent = price(priceFor(art, state.format));
    $("#work-scale").textContent = t("work.scale", { w: state.format.w, h: state.format.h });
    wall.setFormat(state.format);
  });
  $("#rooms").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-room]");
    if (!b) return;
    state.room = b.dataset.room;
    document.querySelectorAll("#rooms .seg").forEach((s) => s.setAttribute("aria-pressed", String(s === b)));
    await wall.setRoom(state.room);
    syncView(wall.view);
  });

  // ── Réalité augmentée ──────────────────────────────────────
  let arImg = null;
  $("#open-ar").addEventListener("click", async () => {
    arImg ??= artCanvas(art);
    const { openAR } = await import("../ar.js");
    openAR(art, state.format, arImg);
  });
}
