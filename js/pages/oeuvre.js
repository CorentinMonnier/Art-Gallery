import { ARTWORKS, getArtwork } from "../data.js";
import { CONFIG } from "../config.js";
import { initSite, cardHTML, preloadImages, applyPalette, restorePalette, t, L, price } from "../site.js";
import { mountWall } from "../wall.js";

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

  const state = { room: "salon", format: CONFIG.formats[1] };
  const $ = (s) => document.querySelector(s);

  const renderText = () => {
    document.title = `${L(art.title)} | ${CONFIG.brand}`;
    $("#work-title").textContent = L(art.title);
    $("#work-text").textContent = L(art.text);
    $("#work-scale").textContent = t("work.scale", { w: state.format.w, h: state.format.h });
    $("#work-price").textContent = price(state.format.price);
    $("#sizes").innerHTML = CONFIG.formats.map((f) => `
      <label class="choice">
        <input type="radio" name="size" id="size-${f.id}" value="${f.id}"${f.id === state.format.id ? " checked" : ""}>
        <span>${f.w} × ${f.h} cm</span>
        <span class="choice-price">${price(f.price)}</span>
      </label>`).join("");
    $("#rooms").innerHTML = ["salon", "chambre", "bureau"].map((r) => `
      <button type="button" class="seg" data-room="${r}" aria-pressed="${r === state.room}">${t("work.rooms." + r)}</button>`).join("");
    const others = ARTWORKS.filter((a) => a.id !== art.id);
    const start = ARTWORKS.indexOf(art) % others.length;
    $("#more").innerHTML = [0, 1, 2].map((i) => cardHTML(others[(start + i) % others.length])).join("");
  };
  renderText();
  window.addEventListener("langchange", renderText);

  const add = $("#add-to-cart");
  add.disabled = !CONFIG.shopOpen;
  // Plus tard : ce bouton enverra art.shopifyHandle + state.format.id au panier Shopify.
  add.dataset.handle = art.shopifyHandle || "";

  const wall = await mountWall($("#wall-stage"), art, { room: state.room, format: state.format });

  $("#sizes").addEventListener("change", (e) => {
    state.format = CONFIG.formats.find((f) => f.id === e.target.value);
    $("#work-price").textContent = price(state.format.price);
    $("#work-scale").textContent = t("work.scale", { w: state.format.w, h: state.format.h });
    wall.setFormat(state.format);
  });
  $("#rooms").addEventListener("click", (e) => {
    const b = e.target.closest("[data-room]");
    if (!b) return;
    state.room = b.dataset.room;
    document.querySelectorAll("#rooms .seg").forEach((s) => s.setAttribute("aria-pressed", String(s === b)));
    wall.setRoom(state.room);
  });
}
