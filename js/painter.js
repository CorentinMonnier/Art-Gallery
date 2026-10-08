// ─────────────────────────────────────────────────────────────
// Le "peintre" : il repeint une œuvre coup de pinceau par coup de
// pinceau sur un canvas. Chaque couche (le fond, puis chaque forme)
// est révélée par des traits larges, comme un vrai timelapse.
// Le canvas obtenu est utilisé comme texture de la toile 3D.
// ─────────────────────────────────────────────────────────────

import { composeArtwork, drawShape, RATIO, rng, makeCanvas } from "./art.js";

const LINEN = "#E7DFD2"; // couleur de la toile vierge

export class Painter {
  constructor(W = 720) {
    this.W = W;
    this.H = Math.round(W * RATIO);
    this.canvas = makeCanvas(this.W, this.H);
    this.ctx = this.canvas.getContext("2d");
    this.cum = makeCanvas(this.W, this.H);
    this.cctx = this.cum.getContext("2d");
    this.src = makeCanvas(this.W, this.H);
    this.sctx = this.src.getContext("2d");
    this.brush = { x: 0, y: 0, u: 0.5, v: 0.5, active: false, color: "#ffffff" };
    this.done = true;
    this.blank();
  }

  blank() {
    for (const c of [this.ctx, this.cctx]) {
      c.fillStyle = LINEN;
      c.fillRect(0, 0, this.W, this.H);
    }
  }

  start(art, duration = 7) {
    this.art = art;
    this.blank();
    if (art._img) {
      // Vraie image : une première passe floue, puis l'image nette.
      this.layers = [
        { kind: "image-rough", bbox: [0, 0, 1, RATIO], color: art.colors[0] },
        { kind: "image", bbox: [0, 0, 1, RATIO], color: art.colors[1] || art.colors[0] },
      ];
    } else {
      const comp = composeArtwork(art);
      this.layers = [{ kind: "ground", bbox: [0, 0, 1, RATIO], color: comp.ground }, ...comp.shapes];
    }
    const r = rng(art.seed + 7);
    this.plans = this.layers.map((L, i) => planStrokes(L.bbox, this.W, r, i === 0));
    const total = this.plans.reduce((sum, p) => sum + p.length, 0);
    this.speed = total / duration;
    this.li = -1;
    this.si = 0;
    this.pi = 0;
    this.done = false;
    this.nextLayer();
  }

  nextLayer() {
    this.li++;
    if (this.li >= this.layers.length) {
      this.done = true;
      this.brush.active = false;
      return false;
    }
    const L = this.layers[this.li];
    const c = this.cctx;
    if (L.kind === "ground") {
      c.fillStyle = L.color;
      c.fillRect(0, 0, this.W, this.H);
    } else if (L.kind === "image-rough") {
      const tiny = makeCanvas(24, 36);
      tiny.getContext("2d").drawImage(this.art._img, 0, 0, 24, 36);
      c.imageSmoothingEnabled = true;
      c.drawImage(tiny, 0, 0, this.W, this.H);
    } else if (L.kind === "image") {
      c.drawImage(this.art._img, 0, 0, this.W, this.H);
    } else {
      drawShape(c, L, this.W);
    }
    this.sctx.clearRect(0, 0, this.W, this.H);
    this.sctx.drawImage(this.cum, 0, 0);
    this.pattern = this.ctx.createPattern(this.src, "no-repeat");
    this.si = 0;
    this.pi = 0;
    this.brush.color = L.color || (L.colors && L.colors[0]) || "#ffffff";
    return true;
  }

  // Avance la peinture de `dt` secondes. Renvoie true si le canvas a changé.
  step(dt) {
    if (this.done) return false;
    let budget = this.speed * dt;
    const ctx = this.ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.pattern;
    let changed = false;
    while (budget > 0 && !this.done) {
      const strokes = this.plans[this.li].strokes;
      if (this.si >= strokes.length) {
        if (!this.nextLayer()) break;
        ctx.strokeStyle = this.pattern;
        continue;
      }
      const st = strokes[this.si];
      if (this.pi >= st.pts.length - 1) {
        this.si++;
        this.pi = 0;
        continue;
      }
      const a = st.pts[this.pi];
      const b = st.pts[this.pi + 1];
      ctx.lineWidth = st.w;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      budget -= Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.pi++;
      this.brush.x = b[0];
      this.brush.y = b[1];
      this.brush.u = b[0] / this.W;
      this.brush.v = b[1] / this.H;
      this.brush.active = true;
      changed = true;
    }
    return changed;
  }

  // Termine immédiatement (utilisé si l'utilisateur préfère réduire les animations).
  finish() {
    while (!this.done) this.step(1e6);
  }
}

// Prépare les coups de pinceau qui couvrent une zone (bbox en largeurs de toile).
function planStrokes(bbox, W, r, isGround) {
  const x0 = bbox[0] * W, y0 = bbox[1] * W, x1 = bbox[2] * W, y1 = bbox[3] * W;
  const bw = x1 - x0, bh = y1 - y0;
  const w = isGround ? W * 0.14 : Math.min(Math.max(Math.min(bw, bh) * 0.3, W * 0.035), W * 0.09);
  const vertical = bh > bw * 1.5;
  const major = vertical ? bh : bw;
  const minor = vertical ? bw : bh;
  const gap = w * 0.72;
  const rows = Math.max(1, Math.ceil(minor / gap));
  const strokes = [];
  let length = 0;
  for (let i = 0; i <= rows; i++) {
    const across = Math.min(i * gap, minor);
    const forward = i % 2 === 0;
    const pts = [];
    const step = w * 0.7;
    const n = Math.max(2, Math.ceil((major + w * 0.6) / step));
    for (let j = 0; j <= n; j++) {
      const t = forward ? j / n : 1 - j / n;
      const along = -w * 0.3 + t * (major + w * 0.6);
      const jitter = (r() - 0.5) * w * 0.3;
      const px = vertical ? x0 + across + jitter : x0 + along;
      const py = vertical ? y0 + along : y0 + across + jitter;
      if (pts.length) {
        const p = pts[pts.length - 1];
        length += Math.hypot(px - p[0], py - p[1]);
      }
      pts.push([px, py]);
    }
    strokes.push({ w: w * (0.9 + r() * 0.25), pts });
  }
  return { strokes, length };
}
