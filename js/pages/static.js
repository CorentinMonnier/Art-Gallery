// Pages de texte : Comment c'est fait, À propos, Aide.
import { initSite, restorePalette } from "../site.js";
import { CONFIG } from "../config.js";

restorePalette();
initSite();

document.querySelectorAll("[data-email]").forEach((el) => (el.textContent = CONFIG.email));
document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = CONFIG.brand));

const copy = document.getElementById("copy-email");
if (copy) {
  copy.addEventListener("click", async () => {
    const label = copy.innerHTML;
    try {
      await navigator.clipboard.writeText(CONFIG.email);
      copy.textContent = document.documentElement.lang === "fr" ? "Copié" : "Copied";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector("[data-email]"));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => (copy.innerHTML = label), 1600);
  });
}
