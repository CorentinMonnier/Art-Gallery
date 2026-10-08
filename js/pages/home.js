import { ARTWORKS, getArtwork } from "../data.js";
import { initSite, cardHTML, preloadImages, applyPalette } from "../site.js";
import { mountHero } from "../hero.js";
import { drawRoom2D } from "../wall.js";
import { renderArtwork, makeCanvas, RATIO } from "../art.js";

await preloadImages();
applyPalette(ARTWORKS[0], { persist: false });
initSite();

const featured = document.getElementById("featured");
const renderGrid = () => (featured.innerHTML = ARTWORKS.slice(0, 6).map(cardHTML).join(""));
renderGrid();
window.addEventListener("langchange", renderGrid);

// Aperçu "chez vous" (image fixe de Marée haute dans un salon)
const roomArt = getArtwork("maree-haute");
const img = makeCanvas(600, Math.round(600 * RATIO));
renderArtwork(img.getContext("2d"), roomArt, 600);
const preview = document.getElementById("room-preview");
const c = makeCanvas(1200, 900);
drawRoom2D(c.getContext("2d"), 1200, 900, img, "salon", { w: 60, h: 90 });
preview.src = c.toDataURL("image/jpeg", 0.88);

mountHero(document.getElementById("hero-stage"), document.getElementById("hero-caption"));
