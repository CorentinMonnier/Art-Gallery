import { ARTWORKS } from "../data.js";
import { initSite, cardHTML, preloadImages, restorePalette } from "../site.js";

await preloadImages();
restorePalette();
initSite();

const grid = document.getElementById("collection");
const render = () => (grid.innerHTML = ARTWORKS.map(cardHTML).join(""));
render();
window.addEventListener("langchange", render);
