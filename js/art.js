// ─────────────────────────────────────────────────────────────
// Générateur d'œuvres abstraites "maximalistes".
// Chaque œuvre est une liste de formes (cercles, arcs-en-ciel,
// rayures, points…) tirées au hasard à partir de son `seed` :
// la même œuvre est donc toujours dessinée de la même façon.
// Toutes les mesures sont exprimées en "largeurs de toile" :
// la toile fait 1 de large et RATIO (1,5) de haut.
// ─────────────────────────────────────────────────────────────

export const RATIO = 1.5;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();

export function composeArtwork(art) {
  if (cache.has(art.id)) return cache.get(art.id);
  const r = rng(art.seed);
  const R = (a, b) => a + (b - a) * r();
  const C = art.colors;
  let ci = Math.floor(r() * C.length);
  const col = () => {
    ci = (ci + 1 + Math.floor(r() * 2)) % C.length;
    return C[ci];
  };
  const left = r() < 0.5;
  const S = [];

  S.push({ type: "rect", x: R(0.25, 0.75), y: R(0.35, 1.15), w: R(0.9, 1.4), h: R(0.5, 0.85), rot: R(-0.5, 0.5), color: col() });
  S.push({ type: "half", x: left ? R(-0.05, 0.2) : R(0.8, 1.05), y: R(0.2, 1.3), r: R(0.38, 0.55), rot: R(0, Math.PI * 2), color: col() });
  S.push({ type: "circle", x: R(0.28, 0.72), y: R(0.25, 0.55), r: R(0.18, 0.28), color: col() });
  S.push({ type: "arch", x: R(0.3, 0.7), y: R(1.0, 1.35), r: R(0.28, 0.4), bands: 4, colors: [col(), col(), col(), col()], hole: art.ground });
  S.push({ type: "blob", x: R(0.15, 0.85), y: R(0.45, 1.15), r: R(0.12, 0.19), seed: Math.floor(r() * 1e9), color: col() });
  S.push({ type: "stripes", x: R(0.2, 0.8), y: R(0.15, 1.35), w: R(0.3, 0.48), h: R(0.2, 0.34), rot: R(-0.8, 0.8), n: 4 + Math.floor(r() * 3), color: col() });
  S.push({ type: r() < 0.5 ? "zigzag" : "squiggle", x: R(0.3, 0.7), y: R(0.2, 1.3), w: R(0.5, 0.8), amp: R(0.04, 0.07), n: 5 + Math.floor(r() * 4), lw: R(0.025, 0.038), rot: R(-0.6, 0.6), color: col() });
  S.push({ type: "dots", x: R(0.2, 0.8), y: R(0.15, 1.35), w: R(0.26, 0.4), h: R(0.2, 0.3), rot: R(-0.4, 0.4), cols: 5, rows: 4, dr: R(0.012, 0.019), color: col() });
  S.push({ type: "ring", x: R(0.2, 0.8), y: R(0.2, 1.3), r: R(0.08, 0.13), lw: R(0.025, 0.038), color: col() });
  S.push({ type: "blob", x: R(0.15, 0.85), y: R(0.15, 1.35), r: R(0.06, 0.1), seed: Math.floor(r() * 1e9), color: col() });
  for (let i = 0; i < 3; i++) S.push({ type: "circle", x: R(0.1, 0.9), y: R(0.1, 1.4), r: R(0.025, 0.055), color: col() });

  S.forEach((s) => (s.bbox = bboxOf(s)));
  const comp = { ground: art.ground, shapes: S };
  cache.set(art.id, comp);
  return comp;
}

function bboxOf(s) {
  let e;
  switch (s.type) {
    case "ring": e = s.r + s.lw / 2; break;
    case "rect": case "stripes": case "dots": e = Math.hypot(s.w, s.h) / 2; break;
    case "blob": e = s.r * 1.35; break;
    case "zigzag": case "squiggle": e = s.w / 2 + s.lw; break;
    case "arch": return clamp([s.x - s.r, s.y - s.r, s.x + s.r, s.y]);
    default: e = s.r;
  }
  return clamp([s.x - e, s.y - e, s.x + e, s.y + e]);
}

function clamp(b) {
  return [Math.max(0, b[0]), Math.max(0, b[1]), Math.min(1, b[2]), Math.min(RATIO, b[3])];
}

export function drawShape(ctx, s, k) {
  ctx.save();
  ctx.fillStyle = s.color || "#000";
  ctx.strokeStyle = s.color || "#000";
  switch (s.type) {
    case "circle":
      ctx.beginPath();
      ctx.arc(s.x * k, s.y * k, s.r * k, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "ring":
      ctx.lineWidth = s.lw * k;
      ctx.beginPath();
      ctx.arc(s.x * k, s.y * k, s.r * k, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "half":
      ctx.beginPath();
      ctx.arc(s.x * k, s.y * k, s.r * k, s.rot, s.rot + Math.PI);
      ctx.closePath();
      ctx.fill();
      break;
    case "arch": {
      const bw = s.r / (s.bands + 0.8);
      s.colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(s.x * k, s.y * k, (s.r - i * bw) * k, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = s.hole;
      ctx.beginPath();
      ctx.arc(s.x * k, s.y * k, (s.r - s.bands * bw) * k, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "rect":
      ctx.translate(s.x * k, s.y * k);
      ctx.rotate(s.rot);
      ctx.fillRect((-s.w / 2) * k, (-s.h / 2) * k, s.w * k, s.h * k);
      break;
    case "blob": {
      const rr = rng(s.seed);
      const n = 7;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rad = s.r * (0.72 + rr() * 0.55);
        pts.push([(s.x + Math.cos(a) * rad) * k, (s.y + Math.sin(a) * rad) * k]);
      }
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      ctx.beginPath();
      const start = mid(pts[n - 1], pts[0]);
      ctx.moveTo(start[0], start[1]);
      for (let i = 0; i < n; i++) {
        const m = mid(pts[i], pts[(i + 1) % n]);
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "stripes": {
      ctx.translate(s.x * k, s.y * k);
      ctx.rotate(s.rot);
      const bh = s.h / (2 * s.n - 1);
      for (let i = 0; i < s.n; i++) {
        ctx.fillRect((-s.w / 2) * k, (-s.h / 2 + 2 * i * bh) * k, s.w * k, bh * k);
      }
      break;
    }
    case "dots":
      ctx.translate(s.x * k, s.y * k);
      ctx.rotate(s.rot);
      for (let i = 0; i < s.cols; i++) {
        for (let j = 0; j < s.rows; j++) {
          const x = -s.w / 2 + (i / (s.cols - 1)) * s.w;
          const y = -s.h / 2 + (j / (s.rows - 1)) * s.h;
          ctx.beginPath();
          ctx.arc(x * k, y * k, s.dr * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case "zigzag":
    case "squiggle": {
      ctx.translate(s.x * k, s.y * k);
      ctx.rotate(s.rot);
      ctx.lineWidth = s.lw * k;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (s.type === "zigzag") {
        for (let i = 0; i <= s.n; i++) {
          const x = -s.w / 2 + (i / s.n) * s.w;
          const y = i % 2 ? s.amp : -s.amp;
          i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k);
        }
      } else {
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = -s.w / 2 + t * s.w;
          const y = Math.sin(t * s.n * Math.PI) * s.amp;
          i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k);
        }
      }
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// Ajoute un léger grain de toile pour un rendu moins "numérique".
export function addGrain(ctx, w, h, amount = 9) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const r = rng(42);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

// Dessine l'œuvre complète sur un canvas de largeur W (hauteur W × 1,5).
export function renderArtwork(ctx, art, W, { grain = true } = {}) {
  const H = Math.round(W * RATIO);
  if (art._img) {
    ctx.drawImage(art._img, 0, 0, W, H);
  } else {
    const comp = composeArtwork(art);
    ctx.fillStyle = comp.ground;
    ctx.fillRect(0, 0, W, H);
    comp.shapes.forEach((s) => drawShape(ctx, s, W));
  }
  if (grain) addGrain(ctx, W, H);
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// Précharge la vraie image d'une œuvre si elle existe.
export function loadArtImage(art) {
  if (!art.image || art._img) return Promise.resolve(art);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { art._img = img; resolve(art); };
    img.onerror = () => resolve(art);
    img.src = art.image;
  });
}
