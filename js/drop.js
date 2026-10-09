// ─────────────────────────────────────────────────────────────
// Le drop : compte à rebours avant la sortie des éditions limitées
// et liste d'attente par email.
// ─────────────────────────────────────────────────────────────

import { CONFIG } from "./config.js";
import { LIMITED } from "./data.js";
import { t, L, dropDate, dropLive, formatDropDate, cardHTML } from "./site.js";

export function mountDrop(root) {
  const $ = (s) => root.querySelector(s);

  const render = () => {
    $("#drop-title").textContent = dropLive() ? t("drop.live.title") : t("drop.title");
    $("#drop-text").textContent = t(dropLive() ? "drop.live.text" : "drop.text", { n: CONFIG.limited.edition, date: formatDropDate() });
    $("#drop-works").innerHTML = LIMITED.map(cardHTML).join("");
    $("#countdown").hidden = dropLive();
    $("#waitlist").hidden = dropLive();
  };

  const units = ["d", "h", "m", "s"];
  const tick = () => {
    let s = Math.max(0, Math.floor((dropDate().getTime() - Date.now()) / 1000));
    const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    units.forEach((u) => {
      $(`[data-unit="${u}"] .cd-num`).textContent = String(v[u]).padStart(2, "0");
      $(`[data-unit="${u}"] .cd-label`).textContent = t(`drop.unit.${u}`);
    });
    if (s === 0 && !$("#countdown").hidden) render();
  };

  render();
  tick();
  setInterval(tick, 1000);
  window.addEventListener("langchange", () => { render(); tick(); });

  // Liste d'attente
  const form = $("#waitlist");
  const msg = $("#waitlist-msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!form.email.checkValidity()) {
      msg.textContent = t("drop.form.invalid");
      form.email.focus();
      return;
    }
    if (!CONFIG.waitlistEndpoint) {
      msg.textContent = t("drop.form.proto");
      return;
    }
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      const res = await fetch(CONFIG.waitlistEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, source: "drop" }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      msg.textContent = t("drop.form.ok");
    } catch {
      msg.textContent = t("drop.form.error");
    } finally {
      btn.disabled = false;
    }
  });
}
