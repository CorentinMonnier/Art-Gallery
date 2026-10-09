// ─────────────────────────────────────────────────────────────
// Fiche œuvre : la toile chez vous.
//
// Deux vues :
//  • « Photo » (par défaut) : une vraie photo d'intérieur, dans
//    laquelle la toile est accrochée à l'échelle, avec son ombre et
//    la lumière de la pièce. Le plus réaliste.
//  • « 3D » : la même pièce reconstruite en 3D (Three.js), dans
//    laquelle on peut tourner en faisant glisser.
// Si une photo n'existe pas encore, la vue 3D s'affiche à la place.
// Toutes les mesures sont en mètres.
// ─────────────────────────────────────────────────────────────

import { renderArtwork, makeCanvas, RATIO, rng } from "./art.js";
import { weaveTexture } from "./fx.js";

// Réglages de chaque pièce (calés sur les photos du dossier images/rooms).
// photo.x      : centre horizontal de la toile dans la photo (0 = bord gauche, 1 = bord droit)
// photo.bottom : bas de la toile dans la photo (0 = haut, 1 = bas), environ 20-30 cm au-dessus du meuble
// photo.meter  : largeur d'1 mètre de mur, en fraction de la largeur de la photo
//                (ici : largeur du canapé, de la tête de lit ou du bureau en pixels ÷ largeur réelle ÷ largeur de la photo)
// photo.light  : -1 si la lumière vient de la gauche, 1 si elle vient de la droite
export const ROOMS = {
  salon: {
    wall: "#E8E4DD", floor: "#B08A63", art: 1.55,
    photo: { src: "images/rooms/salon.jpg", x: 0.501, bottom: 0.553, meter: 0.246, light: -1 },
  },
  chambre: {
    wall: "#DCE0E3", floor: "#C9B394", art: 1.62,
    photo: { src: "images/rooms/chambre.jpg", x: 0.507, bottom: 0.49, meter: 0.214, light: -1 },
  },
  bureau: {
    wall: "#E4DFD3", floor: "#8E6C4F", art: 1.6,
    photo: { src: "images/rooms/bureau.jpg", x: 0.501, bottom: 0.463, meter: 0.283, light: -1 },
  },
};

// Couleurs de mur proposées dans la vue 3D
export const WALL_COLORS = [
  { id: "auto", hex: null },
  { id: "white", hex: "#F2F1EE" },
  { id: "sage", hex: "#B9C4B0" },
  { id: "clay", hex: "#D7B9A3" },
  { id: "navy", hex: "#2F3B52" },
];

const FURN = {
  sofa: "#5A6273", sofaLight: "#666F80", pillow: "#C9A227", pillow2: "#E9E1D3", rug: "#D8D0C2",
  pot: "#C7C2B8", leaf: "#4E7449", trunk: "#6B5442",
  bed: "#9C8B79", sheet: "#F4F2EE", duvet: "#8EA3B5", stand: "#7A6857", shade: "#F3E8D2",
  desk: "#C9B496", metal: "#2C2C2F", laptop: "#B4B9BF", chair: "#3A3A3E",
};

// Part visible de l'image selon le format (l'image source est en 2:3).
function crop(format) {
  const want = format.h / format.w;
  return want >= RATIO ? { fx: RATIO / want, fy: 1 } : { fx: 1, fy: want / RATIO };
}

export function artCanvas(art) {
  const c = makeCanvas(1024, Math.round(1024 * RATIO));
  renderArtwork(c.getContext("2d"), art, 1024);
  return c;
}

// ── Photos ───────────────────────────────────────────────────
const photoCache = new Map();
export function loadRoomPhoto(roomId) {
  if (!photoCache.has(roomId)) {
    photoCache.set(roomId, new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = ROOMS[roomId].photo.src;
    }));
  }
  return photoCache.get(roomId);
}

// Dessine une photo en "cover" dans le cadre, centrée sur le point (fx, fy).
function coverPhoto(ctx, w, h, photo, fx, fy) {
  const pw = photo.naturalWidth || photo.width, ph = photo.naturalHeight || photo.height;
  const scale = Math.max(w / pw, h / ph);
  const sw = pw * scale, sh = ph * scale;
  const ox = Math.min(0, Math.max(w - sw, w / 2 - fx * sw));
  const oy = Math.min(0, Math.max(h - sh, h * 0.45 - fy * sh));
  ctx.drawImage(photo, ox, oy, sw, sh);
  return { ox, oy, sw, sh };
}

// Accroche une toile : ombres réalistes, image, lumière de la pièce.
// x, y = coin haut gauche, aw × ah = taille en pixels, m = pixels pour 1 mètre.
export function hangCanvas(ctx, img, format, x, y, aw, ah, m, light = -1) {
  const depth = 0.035 * m;  // épaisseur du châssis
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.shadowColor = "rgba(20,16,12,0.22)";
  ctx.shadowBlur = depth * 9;
  ctx.shadowOffsetX = -light * depth * 1.2;
  ctx.shadowOffsetY = depth * 2.2;
  ctx.fillRect(x, y, aw, ah);
  ctx.shadowColor = "rgba(20,16,12,0.38)";
  ctx.shadowBlur = depth * 2;
  ctx.shadowOffsetX = -light * depth * 0.6;
  ctx.shadowOffsetY = depth * 0.9;
  ctx.fillRect(x, y, aw, ah);
  ctx.restore();

  const { fx, fy } = crop(format);
  const iw = img.width * fx, ih = img.height * fy;
  ctx.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, x, y, aw, ah);

  const g = ctx.createLinearGradient(light < 0 ? x : x + aw, y, light < 0 ? x + aw : x, y + ah);
  g.addColorStop(0, "rgba(255,250,240,0.10)");
  g.addColorStop(0.55, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, aw, ah);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(light < 0 ? x + aw - 1 : x, y, 1, ah);
}

// Dessine une pièce avec une ou plusieurs toiles alignées par le bas.
// items : [{ img, format, dx }] où dx est le décalage horizontal du centre, en mètres.
// Renvoie la position de chaque toile (en pixels du canvas).
export function drawArtsOnRoom(ctx, w, h, photo, roomId, items) {
  const p = ROOMS[roomId].photo;
  const tallest = Math.max(...items.map((it) => it.format.h)) / 100;
  // On cadre sur le milieu de la composition.
  const tmpScale = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
  const metersToFrac = p.meter * photo.naturalWidth * tmpScale / (photo.naturalHeight * tmpScale);
  const { ox, oy, sw, sh } = coverPhoto(ctx, w, h, photo, p.x, p.bottom - (tallest / 2) * metersToFrac);
  const m = p.meter * sw;
  const cx = ox + p.x * sw, by = oy + p.bottom * sh;
  return items.map((it) => {
    const aw = (it.format.w / 100) * m, ah = (it.format.h / 100) * m;
    const x = cx + (it.dx || 0) * m - aw / 2, y = by - ah;
    hangCanvas(ctx, it.img, it.format, x, y, aw, ah, m, p.light);
    return { x, y, w: aw, h: ah };
  });
}

export function drawRoomPhoto(ctx, w, h, photo, img, roomId, format) {
  return drawArtsOnRoom(ctx, w, h, photo, roomId, [{ img, format, dx: 0 }])[0];
}

// ── Version 2D simple (secours si ni photo ni 3D) ────────────
export function drawRoom2D(ctx, w, h, img, roomId, format) {
  const room = ROOMS[roomId];
  const ppm = Math.min(h / 2.5, w / 3.0);
  const floorY = Math.min(h * 0.92, h / 2 + 1.3 * ppm);
  const cx = w / 2;
  const R = (x, y, rw, rh, c) => { ctx.fillStyle = c; ctx.fillRect(cx + x * ppm, floorY - (y + rh) * ppm, rw * ppm, rh * ppm); };

  ctx.fillStyle = room.wall; ctx.fillRect(0, 0, w, floorY);
  ctx.fillStyle = room.floor; ctx.fillRect(0, floorY, w, h - floorY);
  const ao = ctx.createLinearGradient(0, floorY - 0.3 * ppm, 0, floorY);
  ao.addColorStop(0, "rgba(0,0,0,0)"); ao.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = ao; ctx.fillRect(0, floorY - 0.3 * ppm, w, 0.3 * ppm);

  if (roomId === "salon") {
    R(-1.1, 0.05, 2.2, 0.85, FURN.sofa);
    R(-1.0, 0.42, 2.0, 0.14, FURN.sofaLight);
    R(-0.85, 0.56, 0.38, 0.32, FURN.pillow);
    R(1.45, 0, 0.36, 0.36, FURN.pot);
    ctx.fillStyle = FURN.leaf; ctx.beginPath();
    ctx.ellipse(cx + 1.63 * ppm, floorY - 0.78 * ppm, 0.3 * ppm, 0.42 * ppm, 0, 0, Math.PI * 2); ctx.fill();
  } else if (roomId === "chambre") {
    R(-0.95, 0, 1.9, 1.0, FURN.bed);
    R(-0.9, 0.3, 1.8, 0.3, FURN.sheet);
    R(-0.92, 0.3, 1.84, 0.18, FURN.duvet);
    R(-1.55, 0, 0.45, 0.5, FURN.stand); R(1.1, 0, 0.45, 0.5, FURN.stand);
    R(-1.43, 0.5, 0.2, 0.22, FURN.shade); R(1.22, 0.5, 0.2, 0.22, FURN.shade);
  } else {
    R(-0.7, 0.72, 1.4, 0.04, FURN.desk);
    R(-0.66, 0, 0.04, 0.72, FURN.metal); R(0.62, 0, 0.04, 0.72, FURN.metal);
    R(-0.35, 0.76, 0.34, 0.2, FURN.laptop);
    R(0.0, 0.45, 0.48, 0.06, FURN.metal); R(0.02, 0.51, 0.44, 0.45, FURN.metal);
  }

  const aw = (format.w / 100) * ppm, ah = (format.h / 100) * ppm;
  const ax = cx - aw / 2, ay = floorY - room.art * ppm - ah / 2;
  const { fx, fy } = crop(format);
  const sw = img.width * fx, sh = img.height * fy;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = 0.12 * ppm;
  ctx.shadowOffsetX = 0.04 * ppm;
  ctx.shadowOffsetY = 0.06 * ppm;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, ax, ay, aw, ah);
  ctx.restore();
}

// ── Composant principal ──────────────────────────────────────
// Vues : "photo" (photo de la pièce), "3d" (pièce en 3D), "home" (photo du client).
export async function mountWall(container, art, { room = "salon", format, onView }) {
  const img = artCanvas(art);
  const state = {
    room, format, view: null,
    shown: { w: format.w, h: format.h },
    rect: null,                       // position de la toile (pixels CSS, dans le cadre)
    home: null,                       // { photo, x, y, meter } pour la vue "Chez moi"
  };

  const photoCanvas = makeCanvas(10, 10);
  photoCanvas.className = "wall-photo";
  photoCanvas.hidden = true;
  container.append(photoCanvas);

  let scene3d = null;
  const ensure3D = async () => {
    if (!scene3d) scene3d = await create3D(container, art, img, state.room, state.format);
    return scene3d;
  };

  const sizeCanvas = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth || 600, h = container.clientHeight || 450;
    photoCanvas.width = Math.round(w * dpr);
    photoCanvas.height = Math.round(h * dpr);
    return dpr;
  };

  const draw = async () => {
    if (state.view === "photo") {
      const photo = await loadRoomPhoto(state.room);
      if (!photo || state.view !== "photo") return;
      const dpr = sizeCanvas();
      const r = drawRoomPhoto(photoCanvas.getContext("2d"), photoCanvas.width, photoCanvas.height, photo, img, state.room, state.shown);
      state.rect = { x: r.x / dpr, y: r.y / dpr, w: r.w / dpr, h: r.h / dpr };
    } else if (state.view === "home" && state.home) {
      const dpr = sizeCanvas();
      const ctx = photoCanvas.getContext("2d");
      const W = photoCanvas.width, H = photoCanvas.height;
      const ph = state.home.photo;
      const scale = Math.min(W / ph.width, H / ph.height);     // photo entière, sans recadrage
      const pw = ph.width * scale, phh = ph.height * scale;
      const ox = (W - pw) / 2, oy = (H - phh) / 2;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(ph, ox, oy, pw, phh);
      const m = state.home.meter * pw;
      const aw = (state.shown.w / 100) * m, ah = (state.shown.h / 100) * m;
      const x = ox + state.home.x * pw - aw / 2, y = oy + state.home.y * phh - ah / 2;
      hangCanvas(ctx, img, state.shown, x, y, aw, ah, m, -1);
      state.rect = { x: x / dpr, y: y / dpr, w: aw / dpr, h: ah / dpr };
      state.home.box = { ox: ox / dpr, oy: oy / dpr, pw: pw / dpr, ph: phh / dpr };
    }
  };
  new ResizeObserver(() => draw()).observe(container);

  // Changement de taille en douceur
  let anim = 0;
  const animateFormat = () => {
    cancelAnimationFrame(anim);
    const from = { ...state.shown };
    const to = { w: state.format.w, h: state.format.h };
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 450);
      const e = 1 - (1 - p) ** 3;
      state.shown = { w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
      draw();
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };

  // Vue "Chez moi" : on fait glisser la toile sur la photo du client
  let drag = null;
  photoCanvas.addEventListener("pointerdown", (e) => {
    if (state.view !== "home" || !state.home) return;
    const r = photoCanvas.getBoundingClientRect();
    drag = { x: e.clientX - r.left, y: e.clientY - r.top, hx: state.home.x, hy: state.home.y };
    photoCanvas.setPointerCapture(e.pointerId);
    photoCanvas.classList.add("dragging");
  });
  photoCanvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const r = photoCanvas.getBoundingClientRect();
    const b = state.home.box;
    state.home.x = Math.max(0, Math.min(1, drag.hx + (e.clientX - r.left - drag.x) / b.pw));
    state.home.y = Math.max(0, Math.min(1, drag.hy + (e.clientY - r.top - drag.y) / b.ph));
    draw();
  });
  const endDrag = () => { drag = null; photoCanvas.classList.remove("dragging"); };
  photoCanvas.addEventListener("pointerup", endDrag);
  photoCanvas.addEventListener("pointercancel", endDrag);

  const hasPhoto = async (r = state.room) => !!(await loadRoomPhoto(r));

  const setView = async (view) => {
    if (view === "photo" && !(await hasPhoto())) view = "3d";
    if (view === "home" && !state.home) view = (await hasPhoto()) ? "photo" : "3d";
    state.view = view;
    photoCanvas.hidden = view === "3d";
    photoCanvas.classList.toggle("is-home", view === "home");
    if (view === "3d") {
      const s3 = await ensure3D();
      s3.el.hidden = false;
      s3.setRoom(state.room);
      s3.setFormat(state.format, true);
    } else {
      if (scene3d) scene3d.el.hidden = true;
      state.shown = { w: state.format.w, h: state.format.h };
      await draw();
    }
    onView?.(view);
    return view;
  };

  await setView((await hasPhoto(room)) ? "photo" : "3d");

  return {
    setView,
    hasPhoto,
    get view() { return state.view; },
    get hasHome() { return !!state.home; },
    async setRoom(r) {
      state.room = r;
      if (state.view === "photo") {
        if (await hasPhoto(r)) draw();
        else await setView("3d");
      } else scene3d?.setRoom(r);
    },
    setFormat(f) {
      state.format = f;
      if (state.view === "3d") scene3d?.setFormat(f);
      else animateFormat();
    },
    // Photo du client (fichier choisi sur son appareil, jamais envoyé)
    async setHomePhoto(file) {
      const url = URL.createObjectURL(file);
      const ph = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });
      state.home = { photo: ph, x: 0.5, y: 0.38, meter: 0.25 };
      return setView("home");
    },
    // Taille de la toile sur la photo du client (0 à 1)
    setHomeScale(v) {
      if (!state.home) return;
      state.home.meter = 0.08 + v * 0.5;
      draw();
    },
    get homeScale() { return state.home ? (state.home.meter - 0.08) / 0.5 : 0.34; },
    setWallColor(hex) { scene3d?.setWallColor?.(hex); },
    // Image de la vue actuelle, pour l'enregistrer
    snapshot() {
      return new Promise((resolve) => photoCanvas.toBlob(resolve, "image/jpeg", 0.92));
    },
    // Position de la toile à l'écran (pour l'animation de la toile qui vole)
    artRect() {
      const c = container.getBoundingClientRect();
      if (state.view === "3d") {
        const r = scene3d?.artRect?.();
        return r ? { left: c.left + r.x, top: c.top + r.y, width: r.w, height: r.h } : null;
      }
      const r = state.rect;
      return r ? { left: c.left + r.x, top: c.top + r.y, width: r.w, height: r.h } : null;
    },
  };
}

async function create3D(container, art, img, roomId, format) {
  let THREE = null;
  try { THREE = await import("three"); } catch { THREE = null; }
  if (THREE && webglAvailable()) {
    try { return await mount3D(THREE, container, art, img, roomId, format); }
    catch (err) { console.warn("3D indisponible, passage en 2D", err); container.querySelector(".wall-gl")?.remove(); }
  }
  return mount2D(container, img, roomId, format);
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

function mount2D(container, img, room, format) {
  const c = makeCanvas(10, 10);
  c.className = "wall-2d";
  container.append(c);
  const draw = () => {
    if (c.hidden) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth || 600, h = container.clientHeight || 450;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    drawRoom2D(c.getContext("2d"), c.width, c.height, img, room, format);
  };
  new ResizeObserver(draw).observe(container);
  draw();
  return {
    el: c,
    setRoom(r) { room = r; draw(); },
    setFormat(f) { format = f; draw(); },
  };
}

// ── Textures fabriquées par le code (parquet, enduit, tissu) ──
function woodTexture(THREE, base) {
  const c = makeCanvas(1024, 1024);
  const g = c.getContext("2d");
  const r = rng(7);
  const rows = 8, plankH = 1024 / rows;
  const tint = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  };
  for (let row = 0; row < rows; row++) {
    let x = -r() * 400;
    while (x < 1024) {
      const len = 300 + r() * 380;
      g.fillStyle = tint(base, 0.88 + r() * 0.2);
      g.fillRect(x, row * plankH, len, plankH);
      // veines du bois
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(60,35,15,${0.04 + r() * 0.07})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        const y0 = row * plankH + r() * plankH;
        g.moveTo(x, y0);
        for (let s = 0; s <= 10; s++) g.lineTo(x + (len * s) / 10, y0 + Math.sin(s * 0.9 + k) * (2 + r() * 3));
        g.stroke();
      }
      g.fillStyle = "rgba(40,25,10,0.45)";
      g.fillRect(x, row * plankH, 2, plankH);
      x += len;
    }
    g.fillStyle = "rgba(40,25,10,0.5)";
    g.fillRect(0, row * plankH, 1024, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function noiseTexture(THREE, base, amount, size = 256) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const d = g.getImageData(0, 0, size, size);
  const r = rng(11);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function gradientTexture(THREE, stops) {
  const c = makeCanvas(4, 256);
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([o, col]) => grd.addColorStop(o, col));
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

async function mount3D(THREE, container, art, img, roomId, format) {
  // Modules optionnels : éclairage d'intérieur et formes arrondies.
  let RoomEnvironment = null, RoundedBoxGeometry = null;
  try { ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js")); } catch { /* facultatif */ }
  try { ({ RoundedBoxGeometry } = await import("three/addons/geometries/RoundedBoxGeometry.js")); } catch { /* facultatif */ }

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = "wall-gl";
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

  // Éclairage : lumière d'intérieur douce (reflets réalistes) + soleil de fenêtre.
  if (RoomEnvironment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.7;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7a58f, 0.6));
  } else {
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7a58f, 2.4));
  }
  const sun = new THREE.DirectionalLight(0xfff1de, 1.7);
  sun.position.set(-3.2, 4.5, 4.2);           // fenêtre à gauche
  sun.target.position.set(0, 1.2, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 0.5, far: 16 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const mats = new Map();
  const mat = (c, opts = {}) => {
    const key = c + JSON.stringify(opts);
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...opts }));
    return mats.get(key);
  };
  const shape = (w, h, d, radius) => RoundedBoxGeometry && radius
    ? new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2, h / 2, d / 2))
    : new THREE.BoxGeometry(w, h, d);
  const box = (w, h, d, material, x, y, z, radius = 0) => {
    const m = new THREE.Mesh(shape(w, h, d, radius), typeof material === "string" ? mat(material) : material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Mur (enduit) et sol (parquet)
  const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.96 });
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
  wall.position.set(0, 3, 0);
  wall.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 5);
  floor.receiveShadow = true;
  scene.add(wall, floor, box(16, 0.1, 0.018, mat("#F5F3EF", { roughness: 0.5 }), 0, 0.05, 0.009));

  // Ombres d'angle (occlusion ambiante) entre le mur et le sol
  const aoWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.45), new THREE.MeshBasicMaterial({
    map: gradientTexture(THREE, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.22)"]]), transparent: true, depthWrite: false,
  }));
  aoWall.position.set(0, 0.225, 0.002);
  const aoFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.5), new THREE.MeshBasicMaterial({
    map: gradientTexture(THREE, [[0, "rgba(0,0,0,0.2)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false,
  }));
  aoFloor.rotation.x = -Math.PI / 2;
  aoFloor.position.set(0, 0.002, 0.25);
  scene.add(aoWall, aoFloor);

  // La toile
  const tex = new THREE.CanvasTexture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const edge = new THREE.MeshStandardMaterial({ color: art.ground, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, bumpMap: weaveTexture(THREE, 10, 15), bumpScale: 1.2 });
  const artMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.035), [edge, edge, edge, edge, front, edge]);
  artMesh.castShadow = true;
  scene.add(artMesh);

  // Ombre de contact derrière la toile
  const halo = makeCanvas(128, 128);
  const hg = halo.getContext("2d");
  const hgr = hg.createRadialGradient(64, 64, 20, 64, 64, 64);
  hgr.addColorStop(0, "rgba(0,0,0,0.25)"); hgr.addColorStop(1, "rgba(0,0,0,0)");
  hg.fillStyle = hgr; hg.fillRect(0, 0, 128, 128);
  const artShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(halo), transparent: true, depthWrite: false,
  }));
  artShadow.position.z = 0.003;
  scene.add(artShadow);

  const fabric = (c) => new THREE.MeshStandardMaterial({ map: noiseTexture(THREE, c, 18), roughness: 0.95 });

  // Mobilier
  const builders = {
    salon(g) {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshStandardMaterial({ map: noiseTexture(THREE, FURN.rug, 26), roughness: 1 }));
      rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.004, 1.25); rug.receiveShadow = true; g.add(rug);
      const sofa = fabric(FURN.sofa), seat = fabric(FURN.sofaLight);
      g.add(box(2.2, 0.36, 0.92, sofa, 0, 0.27, 0.56, 0.06));
      g.add(box(2.2, 0.52, 0.24, sofa, 0, 0.7, 0.2, 0.08));
      g.add(box(0.22, 0.6, 0.92, sofa, -1.0, 0.39, 0.56, 0.08), box(0.22, 0.6, 0.92, sofa, 1.0, 0.39, 0.56, 0.08));
      g.add(box(0.88, 0.15, 0.66, seat, -0.45, 0.52, 0.62, 0.06), box(0.88, 0.15, 0.66, seat, 0.45, 0.52, 0.62, 0.06));
      const p1 = box(0.44, 0.38, 0.13, fabric(FURN.pillow), -0.6, 0.76, 0.37, 0.06); p1.rotation.z = 0.12; g.add(p1);
      const p2 = box(0.42, 0.36, 0.13, fabric(FURN.pillow2), 0.58, 0.75, 0.37, 0.06); p2.rotation.z = -0.1; g.add(p2);
      [-1.0, 1.0].forEach((x) => [0.15, 0.95].forEach((z) => g.add(box(0.05, 0.09, 0.05, FURN.metal, x, 0.045, z))));
      // plante
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.4, 32), mat(FURN.pot, { roughness: 0.6 }));
      pot.position.set(1.75, 0.2, 0.4); pot.castShadow = true; g.add(pot);
      const r = rng(3);
      for (let i = 0; i < 16; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat(FURN.leaf, { roughness: 0.6 }));
        const a = r() * Math.PI * 2, rad = 0.05 + r() * 0.2;
        leaf.position.set(1.75 + Math.cos(a) * rad, 0.55 + r() * 0.65, 0.4 + Math.sin(a) * rad);
        leaf.scale.set(0.5, 1.4, 0.18);
        leaf.rotation.set(r() - 0.5, a, (r() - 0.5) * 1.2);
        leaf.castShadow = true;
        g.add(leaf);
      }
      // table basse
      g.add(box(0.9, 0.04, 0.5, mat("#D9CBB6", { roughness: 0.4 }), 0, 0.38, 1.55, 0.015));
      [-0.4, 0.4].forEach((x) => [1.35, 1.75].forEach((z) => g.add(box(0.03, 0.36, 0.03, FURN.metal, x, 0.18, z))));
    },
    chambre(g) {
      const wood = mat(FURN.bed, { roughness: 0.6 });
      g.add(box(1.9, 1.05, 0.08, fabric(FURN.bed), 0, 0.52, 0.05, 0.03));
      g.add(box(1.8, 0.3, 2.1, wood, 0, 0.2, 1.1, 0.03));
      g.add(box(1.7, 0.22, 2.0, fabric(FURN.sheet), 0, 0.46, 1.08, 0.08));
      g.add(box(1.76, 0.1, 1.35, fabric(FURN.duvet), 0, 0.6, 1.42, 0.05));
      g.add(box(0.62, 0.15, 0.42, fabric(FURN.sheet), -0.42, 0.64, 0.33, 0.07), box(0.62, 0.15, 0.42, fabric(FURN.sheet), 0.42, 0.64, 0.33, 0.07));
      [-1.32, 1.32].forEach((x) => {
        g.add(box(0.46, 0.5, 0.4, mat(FURN.stand, { roughness: 0.55 }), x, 0.25, 0.22, 0.02));
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.22, 32, 1, true), mat(FURN.shade, { side: THREE.DoubleSide, emissive: "#3a2f1c" }));
        lamp.position.set(x, 0.74, 0.22); lamp.castShadow = true;
        g.add(lamp, box(0.025, 0.14, 0.025, FURN.metal, x, 0.57, 0.22));
      });
    },
    bureau(g) {
      const top = mat(FURN.desk, { roughness: 0.45 });
      g.add(box(1.4, 0.035, 0.7, top, 0, 0.74, 0.4, 0.01));
      [-0.66, 0.66].forEach((x) => [0.1, 0.7].forEach((z) => g.add(box(0.03, 0.72, 0.03, FURN.metal, x, 0.36, z))));
      g.add(box(0.34, 0.015, 0.24, mat(FURN.laptop, { metalness: 0.6, roughness: 0.35 }), -0.25, 0.765, 0.45, 0.006));
      const screen = box(0.34, 0.23, 0.01, mat(FURN.laptop, { metalness: 0.6, roughness: 0.35 }), -0.25, 0.88, 0.33, 0.004); screen.rotation.x = -0.25; g.add(screen);
      g.add(box(0.025, 0.42, 0.025, FURN.metal, 0.45, 0.96, 0.25));
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 32, 1, true), mat(FURN.shade, { side: THREE.DoubleSide }));
      shade.position.set(0.45, 1.18, 0.3); g.add(shade);
      const chair = fabric(FURN.chair);
      g.add(box(0.48, 0.07, 0.46, chair, 0.1, 0.47, 1.05, 0.03));
      g.add(box(0.46, 0.46, 0.06, chair, 0.1, 0.76, 1.27, 0.03));
      g.add(box(0.04, 0.43, 0.04, FURN.metal, 0.1, 0.215, 1.05));
      // étagère murale avec livres
      g.add(box(0.9, 0.03, 0.22, top, 1.45, 1.35, 0.12, 0.01));
      const r = rng(5);
      for (let i = 0; i < 9; i++) {
        const h = 0.18 + r() * 0.08;
        g.add(box(0.035 + r() * 0.02, h, 0.16, ["#7E5A4A", "#3E556E", "#C8B27E", "#5E6B55", "#A8483C"][i % 5], 1.1 + i * 0.05, 1.365 + h / 2, 0.12));
      }
    },
  };
  let furniture = new THREE.Group();
  scene.add(furniture);

  const target = new THREE.Vector3(0, 1.35, 0);
  let wallColor = null;   // couleur choisie par le client (null = couleur de la pièce)
  let currentRoom = roomId;
  const paintWall = () => {
    const c = wallColor || ROOMS[currentRoom].wall;
    wallMat.map?.dispose();
    wallMat.map = noiseTexture(THREE, c, 7, 512);
    wallMat.map.repeat.set(6, 2);
    wallMat.needsUpdate = true;
    scene.background = new THREE.Color(c);
  };
  const applyRoom = (id) => {
    currentRoom = id;
    const room = ROOMS[id];
    scene.remove(furniture);
    furniture.traverse((o) => o.geometry?.dispose());
    furniture = new THREE.Group();
    builders[id](furniture);
    scene.add(furniture);
    floorMat.map?.dispose();
    floorMat.map = woodTexture(THREE, room.floor);
    floorMat.map.repeat.set(4, 2.5);
    floorMat.needsUpdate = true;
    paintWall();
    target.y = room.art - 0.2;
    artMesh.position.y = room.art;
    artShadow.position.y = room.art - 0.03;
  };

  // Taille de la toile, avec une petite transition
  const scale = { w: format.w / 100, h: format.h / 100, fw: format.w / 100, fh: format.h / 100, t: 1 };
  const applyFormat = (f, instant = false) => {
    const { fx, fy } = crop(f);
    tex.repeat.set(fx, fy);
    tex.offset.set((1 - fx) / 2, (1 - fy) / 2);
    scale.fw = instant ? f.w / 100 : scale.w;
    scale.fh = instant ? f.h / 100 : scale.h;
    scale.w = f.w / 100; scale.h = f.h / 100;
    scale.t = instant ? 1 : 0;
  };

  // Caméra : on tourne autour du mur en faisant glisser
  const view = { yaw: 0.14, pitch: 0.08, ty: 0.14, tp: 0.08 };
  const placeCamera = () => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max(4.1, 1.75 / (tan * camera.aspect));
    camera.position.set(
      target.x + Math.sin(view.yaw) * Math.cos(view.pitch) * d,
      target.y + Math.sin(view.pitch) * d,
      target.z + Math.cos(view.yaw) * Math.cos(view.pitch) * d,
    );
    camera.lookAt(target);
  };
  const fit = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(container);
  fit();

  let drag = null;
  const el = renderer.domElement;
  el.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, yaw: view.ty, pitch: view.tp };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    view.ty = Math.max(-0.5, Math.min(0.5, drag.yaw - (e.clientX - drag.x) * 0.004));
    view.tp = Math.max(-0.02, Math.min(0.3, drag.pitch + (e.clientY - drag.y) * 0.003));
  });
  const end = () => (drag = null);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);

  applyRoom(roomId);
  applyFormat(format, true);

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(container);
  let last = performance.now();
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden || el.hidden) return;
    if (scale.t < 1) scale.t = Math.min(1, scale.t + dt / 0.5);
    const e = 1 - (1 - scale.t) ** 3;
    const sw = scale.fw + (scale.w - scale.fw) * e, sh = scale.fh + (scale.h - scale.fh) * e;
    artMesh.scale.set(sw, sh, 1);
    artMesh.position.z = 0.0175 + 0.006;
    artShadow.scale.set(sw * 1.25, sh * 1.18, 1);
    view.yaw += (view.ty - view.yaw) * 0.12;
    view.pitch += (view.tp - view.pitch) * 0.12;
    placeCamera();
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);

  // Position de la toile à l'écran (pixels CSS dans le cadre)
  const box3 = new THREE.Box3();
  const v = new THREE.Vector3();
  const artRect = () => {
    box3.setFromObject(artMesh);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const cx of [box3.min.x, box3.max.x]) for (const cy of [box3.min.y, box3.max.y]) {
      v.set(cx, cy, box3.max.z).project(camera);
      const px = (v.x * 0.5 + 0.5) * container.clientWidth, py = (-v.y * 0.5 + 0.5) * container.clientHeight;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  return {
    el,
    setRoom: applyRoom,
    setFormat: (f, instant) => applyFormat(f, instant),
    setWallColor: (hex) => { wallColor = hex; paintWall(); },
    artRect,
  };
}
