import { getArtwork, ARTWORKS } from "../data.js";
import { initSite, preloadImages, applyPalette } from "../site.js";
import { mountCarousel } from "../carousel.js";
import { drawRoom2D } from "../wall.js";
import { renderArtwork, makeCanvas, RATIO } from "../art.js";

await preloadImages();
applyPalette(ARTWORKS[0], { persist: false });
initSite();

// Le manège 3D
const $ = (id) => document.getElementById(id);
mountCarousel($("ring-stage"), {
  panel: $("ring-panel"),
  title: $("ring-title"),
  price: $("ring-price"),
  link: $("ring-link"),
  prev: $("ring-prev"),
  next: $("ring-next"),
  pause: $("ring-pause"),
  controls: $("ring-controls"),
});

// Aperçu "chez vous" (image fixe de Marée haute dans un salon)
const roomArt = getArtwork("maree-haute");
const img = makeCanvas(600, Math.round(600 * RATIO));
renderArtwork(img.getContext("2d"), roomArt, 600);
const c = makeCanvas(1200, 900);
drawRoom2D(c.getContext("2d"), 1200, 900, img, "salon", { w: 60, h: 90 });
$("room-preview").src = c.toDataURL("image/jpeg", 0.88);
