// ─────────────────────────────────────────────────────────────
// Petits effets 3D partagés : le grain de la toile (relief),
// utilisé pour que la lumière accroche la matière.
// ─────────────────────────────────────────────────────────────

import { makeCanvas, rng } from "./art.js";

// Trame de toile tissée, en niveaux de gris (sert de carte de relief).
let weave = null;
export function weaveCanvas() {
  if (weave) return weave;
  const S = 256;
  weave = makeCanvas(S, S);
  const g = weave.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, S, S);
  const r = rng(99);
  const step = 4;
  for (let y = 0; y < S; y += step) {
    for (let x = 0; x < S; x += step) {
      const over = ((x + y) / step) % 2 === 0;
      const v = (over ? 150 : 105) + (r() - 0.5) * 30;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(x, y, step, step);
    }
  }
  return weave;
}

export function weaveTexture(THREE, repeatX = 5, repeatY = 7.5) {
  const t = new THREE.CanvasTexture(weaveCanvas());
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}
