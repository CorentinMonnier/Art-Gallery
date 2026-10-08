// ─────────────────────────────────────────────────────────────
// Fiche œuvre : le "mur interactif".
// La toile est accrochée à l'échelle réelle dans une pièce en 3D
// (salon, chambre ou bureau). On peut changer la taille, la pièce,
// et faire glisser l'image pour tourner autour.
// Si la 3D n'est pas disponible, on dessine la même scène en 2D.
// Toutes les mesures sont en mètres.
// ─────────────────────────────────────────────────────────────

import { renderArtwork, makeCanvas, RATIO } from "./art.js";

export const ROOMS = {
  salon: { wall: "#E6E1D8", floor: "#A47E5C", art: 1.55 },
  chambre: { wall: "#D6DCE1", floor: "#C2AE90", art: 1.62 },
  bureau: { wall: "#E1DCCF", floor: "#86684D", art: 1.6 },
};

const FURN = {
  sofa: "#3E4A5E", sofaLight: "#4A576C", pillow: "#C9A227", rug: "#CDC2B1",
  pot: "#B5532E", leaf: "#4F7A4A",
  bed: "#8A7969", sheet: "#F3F1EC", duvet: "#7C93A8", stand: "#6E5E50", shade: "#F1E3C2",
  desk: "#C8B49A", metal: "#2E2E30", laptop: "#A7ADB4",
};

// Part visible de l'image selon le format (l'image source est en 2:3).
function crop(format) {
  const want = format.h / format.w;
  return want >= RATIO ? { fx: RATIO / want, fy: 1 } : { fx: 1, fy: want / RATIO };
}

function artCanvas(art) {
  const c = makeCanvas(1024, Math.round(1024 * RATIO));
  renderArtwork(c.getContext("2d"), art, 1024);
  return c;
}

// ── Version 2D (secours, et image de l'accueil) ──────────────
export function drawRoom2D(ctx, w, h, img, roomId, format) {
  const room = ROOMS[roomId];
  const ppm = Math.min(h / 2.5, w / 3.0);
  const floorY = Math.min(h * 0.92, h / 2 + 1.3 * ppm);
  const cx = w / 2;
  const R = (x, y, rw, rh, c) => { ctx.fillStyle = c; ctx.fillRect(cx + x * ppm, floorY - (y + rh) * ppm, rw * ppm, rh * ppm); };

  ctx.fillStyle = room.wall; ctx.fillRect(0, 0, w, floorY);
  ctx.fillStyle = room.floor; ctx.fillRect(0, floorY, w, h - floorY);
  ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0, floorY - 0.08 * ppm, w, 0.08 * ppm);

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

export async function mountWall(container, art, { room = "salon", format }) {
  const img = artCanvas(art);
  let THREE = null;
  try { THREE = await import("three"); } catch { THREE = null; }
  if (THREE && webglAvailable()) {
    try { return mount3D(THREE, container, art, img, room, format); }
    catch (err) { console.warn("3D indisponible, passage en 2D", err); container.querySelector("canvas")?.remove(); }
  }
  return mount2D(container, img, room, format);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = container.clientWidth || 600, h = container.clientHeight || 450;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    drawRoom2D(c.getContext("2d"), c.width, c.height, img, room, format);
  };
  new ResizeObserver(draw).observe(container);
  draw();
  return {
    mode: "2d",
    setRoom(r) { room = r; draw(); },
    setFormat(f) { format = f; draw(); },
  };
}

function mount3D(THREE, container, art, img, roomId, format) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "wall-gl";
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  const mats = new Map();
  const mat = (c) => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    return mats.get(c);
  };
  const box = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // Murs et sol
  const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
  wall.position.set(0, 3, 0);
  wall.receiveShadow = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 10), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 5);
  floor.receiveShadow = true;
  scene.add(wall, floor, box(16, 0.09, 0.02, "#F4F2EE", 0, 0.045, 0.01));

  // La toile
  const tex = new THREE.CanvasTexture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const edge = new THREE.MeshStandardMaterial({ color: art.ground, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const artMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.035), [edge, edge, edge, edge, front, edge]);
  artMesh.castShadow = true;
  scene.add(artMesh);

  // Lumières
  scene.add(new THREE.AmbientLight(0xffffff, 1.35));
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.1);
  sun.position.set(2.2, 4.2, 4.5);
  sun.target.position.set(0, 1.3, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Mobilier
  const builders = {
    salon(g) {
      g.add(box(3.2, 0.012, 2.2, FURN.rug, 0, 0.006, 1.2));
      g.add(box(2.2, 0.38, 0.92, FURN.sofa, 0, 0.27, 0.56));
      g.add(box(2.2, 0.52, 0.22, FURN.sofa, 0, 0.7, 0.2));
      g.add(box(0.2, 0.6, 0.92, FURN.sofa, -1.0, 0.38, 0.56), box(0.2, 0.6, 0.92, FURN.sofa, 1.0, 0.38, 0.56));
      g.add(box(0.88, 0.13, 0.66, FURN.sofaLight, -0.45, 0.52, 0.62), box(0.88, 0.13, 0.66, FURN.sofaLight, 0.45, 0.52, 0.62));
      const p = box(0.42, 0.36, 0.12, FURN.pillow, -0.62, 0.74, 0.36); p.rotation.z = 0.12; g.add(p);
      [-1.0, 1.0].forEach((x) => [0.15, 0.95].forEach((z) => g.add(box(0.06, 0.08, 0.06, FURN.metal, x, 0.04, z))));
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.36, 24), mat(FURN.pot));
      pot.position.set(1.7, 0.18, 0.38); pot.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mat(FURN.leaf));
      leaves.position.set(1.7, 0.72, 0.38); leaves.scale.set(1, 1.35, 1); leaves.castShadow = true;
      g.add(pot, leaves);
    },
    chambre(g) {
      g.add(box(1.9, 1.0, 0.08, FURN.bed, 0, 0.5, 0.05));
      g.add(box(1.8, 0.3, 2.1, FURN.bed, 0, 0.2, 1.1));
      g.add(box(1.7, 0.2, 2.0, FURN.sheet, 0, 0.45, 1.08));
      g.add(box(1.74, 0.09, 1.35, FURN.duvet, 0, 0.58, 1.42));
      g.add(box(0.62, 0.14, 0.4, FURN.sheet, -0.42, 0.62, 0.32), box(0.62, 0.14, 0.4, FURN.sheet, 0.42, 0.62, 0.32));
      [-1.32, 1.32].forEach((x) => {
        g.add(box(0.46, 0.5, 0.4, FURN.stand, x, 0.25, 0.22));
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 24), mat(FURN.shade));
        lamp.position.set(x, 0.72, 0.22); lamp.castShadow = true;
        g.add(lamp, box(0.03, 0.12, 0.03, FURN.metal, x, 0.56, 0.22));
      });
    },
    bureau(g) {
      g.add(box(1.4, 0.04, 0.7, FURN.desk, 0, 0.74, 0.4));
      [-0.66, 0.66].forEach((x) => [0.1, 0.7].forEach((z) => g.add(box(0.035, 0.72, 0.035, FURN.metal, x, 0.36, z))));
      g.add(box(0.34, 0.02, 0.24, FURN.laptop, -0.25, 0.77, 0.45));
      const screen = box(0.34, 0.23, 0.012, FURN.laptop, -0.25, 0.88, 0.33); screen.rotation.x = -0.25; g.add(screen);
      g.add(box(0.05, 0.4, 0.05, FURN.metal, 0.45, 0.96, 0.25));
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.14, 24, 1, true), mat(FURN.shade));
      shade.position.set(0.45, 1.18, 0.3); g.add(shade);
      g.add(box(0.48, 0.06, 0.46, FURN.metal, 0.1, 0.46, 1.05));
      g.add(box(0.46, 0.48, 0.05, FURN.metal, 0.1, 0.74, 1.27));
      g.add(box(0.05, 0.43, 0.05, FURN.metal, 0.1, 0.215, 1.05));
    },
  };
  let furniture = new THREE.Group();
  scene.add(furniture);

  const applyRoom = (id) => {
    roomId = id;
    const room = ROOMS[id];
    scene.remove(furniture);
    furniture.traverse((o) => o.geometry?.dispose());
    furniture = new THREE.Group();
    builders[id](furniture);
    scene.add(furniture);
    wallMat.color.set(room.wall);
    floorMat.color.set(room.floor);
    scene.background = new THREE.Color(room.wall);
    target.y = room.art - 0.2;
    artMesh.position.y = room.art;
  };

  // Taille de la toile, avec une petite transition
  const scale = { w: format.w / 100, h: format.h / 100, fw: format.w / 100, fh: format.h / 100, t: 1 };
  const applyFormat = (f, instant = false) => {
    format = f;
    const { fx, fy } = crop(f);
    tex.repeat.set(fx, fy);
    tex.offset.set((1 - fx) / 2, (1 - fy) / 2);
    scale.fw = scale.w; scale.fh = scale.h;
    scale.w = f.w / 100; scale.h = f.h / 100;
    scale.t = instant ? 1 : 0;
  };

  // Caméra : on tourne autour du mur en faisant glisser
  const target = new THREE.Vector3(0, 1.35, 0);
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
    if (!visible || document.hidden) return;
    if (scale.t < 1) scale.t = Math.min(1, scale.t + dt / 0.5);
    const e = 1 - (1 - scale.t) ** 3;
    artMesh.scale.set(scale.fw + (scale.w - scale.fw) * e, scale.fh + (scale.h - scale.fh) * e, 1);
    artMesh.position.z = 0.0175 + 0.004;
    view.yaw += (view.ty - view.yaw) * 0.12;
    view.pitch += (view.tp - view.pitch) * 0.12;
    placeCamera();
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);

  return {
    mode: "3d",
    setRoom: applyRoom,
    setFormat: (f) => applyFormat(f),
  };
}
