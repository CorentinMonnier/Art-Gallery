import { ARTWORKS } from "../data.js";
import { initSite, preloadImages, restorePalette, cardHTML } from "../site.js";
import { mountGallery } from "../gallery.js";

await preloadImages();
restorePalette();
initSite();

const $ = (id) => document.getElementById(id);
const result = await mountGallery($("gallery-stage"), {
  panel: $("gallery-panel"),
  title: $("g-title"),
  price: $("g-price"),
  link: $("g-link"),
  prev: $("g-prev"),
  next: $("g-next"),
  back: $("g-back"),
});

// Sans 3D : on affiche simplement les œuvres
if (result.mode !== "3d") {
  document.querySelector(".gallery-hero").hidden = true;
  $("gallery-fallback").hidden = false;
  const render = () => ($("gallery-grid").innerHTML = ARTWORKS.map(cardHTML).join(""));
  render();
  window.addEventListener("langchange", render);
}
