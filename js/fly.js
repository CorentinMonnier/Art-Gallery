// ─────────────────────────────────────────────────────────────
// La toile qui vole : quand on clique sur une œuvre (manège,
// collection…), on retient sa position à l'écran. Sur la fiche,
// une copie de l'image part de cette position et vole jusqu'à sa
// place sur le mur de la pièce, puis s'efface.
// ─────────────────────────────────────────────────────────────

const KEY = "flight";

export function rememberFlight(id, rect) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      id, t: Date.now(),
      rect: { x: rect.left ?? rect.x, y: rect.top ?? rect.y, w: rect.width, h: rect.height },
    }));
  } catch { /* stockage indisponible : pas d'animation */ }
}

function takeFlight(id) {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const f = raw && JSON.parse(raw);
    return f && f.id === id && Date.now() - f.t < 8000 ? f : null;
  } catch { return null; }
}

// to : rectangle d'arrivée (coordonnées écran), src : image à faire voler.
export function playFlight(id, src, to) {
  const f = takeFlight(id);
  if (!f || !to || matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve(false);
  const from = f.rect;
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.className = "flyer";
  Object.assign(img.style, {
    left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`,
  });
  document.body.append(img);
  const dx = from.x - to.left, dy = from.y - to.top;
  const sx = from.w / to.width, sy = from.h / to.height;
  const start = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  const mid = `translate(${dx * 0.45}px, ${dy * 0.45 - 40}px) scale(${(sx + 1) / 2}, ${(sy + 1) / 2}) rotateY(-14deg) rotateX(6deg)`;
  const fly = img.animate(
    [
      { transform: start, boxShadow: "0 40px 80px -30px rgba(0,0,0,.5)" },
      { transform: mid, offset: 0.55, boxShadow: "0 60px 90px -30px rgba(0,0,0,.45)" },
      { transform: "none", boxShadow: "0 6px 14px -6px rgba(0,0,0,.35)" },
    ],
    { duration: 1050, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
  );
  return fly.finished.then(() =>
    img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: "forwards" }).finished,
  ).then(() => { img.remove(); return true; });
}
