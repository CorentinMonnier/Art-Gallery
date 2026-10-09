// ─────────────────────────────────────────────────────────────
// La galerie virtuelle : une salle d'exposition en 3D.
// Les œuvres sont accrochées des deux côtés d'une longue allée.
//  - Glisser vers le haut / le bas (ou molette, flèches ↑ ↓) : avancer, reculer
//  - Glisser à gauche / à droite (ou flèches ← →) : regarder autour
//  - Toucher une œuvre : on s'approche, puis « Voir l'œuvre »
// ─────────────────────────────────────────────────────────────

import { ARTWORKS } from "./data.js";
import { renderArtwork, makeCanvas, RATIO, rng } from "./art.js";
import { L, t, price, minPrice, askMotion } from "./site.js";
import { weaveTexture } from "./fx.js";
import { rememberFlight } from "./fly.js";

const SPACING = 3.4;     // distance entre deux œuvres d'un même côté
const HALF = 3;          // demi-largeur de l'allée
const EYE = 1.6;         // hauteur des yeux
const AW = 1.0, AH = AW * RATIO;

function tween(target, vars) {
  if (window.gsap) return window.gsap.to(target, vars);
  const keys = Object.keys(vars).filter((k) => !["duration", "ease", "onUpdate", "onComplete"].includes(k));
  const from = Object.fromEntries(keys.map((k) => [k, target[k]]));
  const dur = (vars.duration ?? 0.8) * 1000, start = performance.now();
  let killed = false;
  const step = (now) => {
    if (killed) return;
    const p = Math.min(1, (now - start) / dur), e = 1 - (1 - p) ** 3;
    keys.forEach((k) => (target[k] = from[k] + (vars[k] - from[k]) * e));
    vars.onUpdate?.();
    if (p < 1) requestAnimationFrame(step); else vars.onComplete?.();
  };
  requestAnimationFrame(step);
  return { kill: () => (killed = true) };
}

function noise(THREE, base, amount, size = 256, repeat = [1, 1]) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const d = g.getImageData(0, 0, size, size);
  const r = rng(21);
  for (let i = 0; i < d.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

function glowTexture(THREE) {
  const c = makeCanvas(256, 256);
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 70, 10, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,244,225,0.55)");
  grd.addColorStop(0.5, "rgba(255,244,225,0.18)");
  grd.addColorStop(1, "rgba(255,244,225,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export async function mountGallery(stage, ui) {
  let THREE = null;
  try { THREE = await import("three"); } catch { THREE = null; }
  let ok = false;
  try {
    const c = document.createElement("canvas");
    ok = !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { ok = false; }
  if (!THREE || !ok) return { mode: "2d" };

  let RoomEnvironment = null;
  try { ({ RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js")); } catch { /* facultatif */ }

  const N = ARTWORKS.length;
  const rows = Math.ceil(N / 2);
  const LENGTH = rows * SPACING + 6;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "gallery-gl";
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#ECEBE8");
  scene.fog = new THREE.Fog("#ECEBE8", 10, LENGTH + 4);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 80);

  if (RoomEnvironment) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8bd, RoomEnvironment ? 1.1 : 2.6));

  // La salle
  const zFar = -LENGTH + 3;
  const zMid = (3 + zFar) / 2;
  const wallMat = new THREE.MeshStandardMaterial({ map: noise(THREE, "#F4F3F0", 6, 256, [8, 2]), roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ map: noise(THREE, "#B9B5AE", 22, 256, [6, 20]), roughness: 0.32, metalness: 0.05 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: "#FAFAF8", roughness: 1 });
  const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  const floor = plane(HALF * 2, LENGTH, floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid);
  const ceil = plane(HALF * 2, LENGTH, ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4, zMid);
  const left = plane(LENGTH, 4, wallMat);
  left.rotation.y = Math.PI / 2; left.position.set(-HALF, 2, zMid);
  const right = plane(LENGTH, 4, wallMat);
  right.rotation.y = -Math.PI / 2; right.position.set(HALF, 2, zMid);
  const end = plane(HALF * 2, 4, wallMat);
  end.position.set(0, 2, zFar);
  scene.add(floor, ceil, left, right, end);
  // Bandes lumineuses au plafond
  const strip = new THREE.MeshBasicMaterial({ color: "#FFFDF7" });
  for (let z = 1; z > zFar + 1; z -= 2.2) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.18), strip);
    s.position.set(0, 3.98, z);
    scene.add(s);
  }
  // Plinthes
  const skirt = new THREE.MeshStandardMaterial({ color: "#E2E0DB", roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, LENGTH), skirt);
    b.position.set(side * (HALF - 0.01), 0.05, zMid);
    scene.add(b);
  });

  // Les œuvres
  const weave = weaveTexture(THREE, 5, 7.5);
  const glow = glowTexture(THREE);
  const back = new THREE.MeshStandardMaterial({ color: "#E9E6E0", roughness: 1 });
  const items = ARTWORKS.map((art, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -1.5 - Math.floor(i / 2) * SPACING;
    const c = makeCanvas(512, Math.round(512 * RATIO));
    renderArtwork(c.getContext("2d"), art, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const edge = new THREE.MeshStandardMaterial({ color: art.ground, roughness: 0.9 });
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, bumpMap: weave, bumpScale: 1.2 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(AW, AH, 0.04), [edge, edge, edge, edge, front, back]);
    mesh.position.set(side * (HALF - 0.03), 1.55, z);
    mesh.rotation.y = -side * Math.PI / 2;
    mesh.userData.index = i;
    // Halo de projecteur sur le mur
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(AW * 2.6, AH * 1.9),
      new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.set(side * (HALF - 0.005), 1.75, z);
    halo.rotation.y = -side * Math.PI / 2;
    scene.add(mesh, halo);
    return { art, mesh, side, z };
  });

  // Caméra
  const cam = { z: 2.2, yaw: 0, pitch: -0.02, tz: 2.2, tyaw: 0 };
  const fit = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 68 : 55;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  const zMin = zFar + 2.5, zMax = 2.6;
  const clampZ = (z) => Math.max(zMin, Math.min(zMax, z));

  // Mode "focus" : la caméra s'approche d'une œuvre
  let focus = null;        // index de l'œuvre regardée de près
  let focusPose = null;    // { x, z, yaw }
  const pose = { x: 0, z: cam.z, yaw: 0 };
  let poseTween = null;
  let animating = false;

  const showPanel = () => {
    if (focus === null) {
      ui.panel.classList.remove("open");
      ui.back.hidden = true;
      ui.title.textContent = t("gallery.walk");
      ui.price.textContent = t("gallery.help");
      ui.link.hidden = true;
      return;
    }
    const art = ARTWORKS[focus];
    ui.panel.classList.add("open");
    ui.back.hidden = false;
    ui.title.textContent = L(art.title);
    ui.price.textContent = `${t("card.from")} ${price(minPrice(art))}`;
    ui.link.hidden = false;
    ui.link.href = `oeuvre.html?id=${art.id}`;
  };

  const goFocus = (i) => {
    focus = ((i % N) + N) % N;
    const it = items[focus];
    focusPose = { x: it.side * (HALF - 2.1), z: it.z, yaw: it.side * Math.PI / 2 };
    poseTween?.kill();
    animating = true;
    poseTween = tween(pose, { x: focusPose.x, z: focusPose.z, yaw: focusPose.yaw, duration: reduced ? 0.01 : 1.3, ease: "power3.inOut", onComplete: () => (animating = false) });
    showPanel();
  };
  const leaveFocus = () => {
    if (focus === null) return;
    cam.tz = clampZ(pose.z + 1.2);
    cam.tyaw = 0;
    poseTween?.kill();
    animating = true;
    poseTween = tween(pose, { x: 0, z: cam.tz, yaw: 0, duration: reduced ? 0.01 : 1.1, ease: "power3.inOut", onComplete: () => { cam.z = cam.tz; cam.yaw = 0; animating = false; } });
    focus = null;
    showPanel();
  };

  // Interactions
  const el = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const meshes = items.map((it) => it.mesh);
  let drag = null;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") askMotion();
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    if (focus !== null) { if (drag.moved > 40) leaveFocus(); return; }
    cam.tyaw = Math.max(-1.1, Math.min(1.1, cam.tyaw + dx * 0.004));
    cam.tz = clampZ(cam.tz + dy * 0.02);
  });
  const up = (e) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (moved > 8) return;
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return;
    const i = hit.object.userData.index;
    if (focus === i) {
      rememberFlight(ARTWORKS[i].id, el.getBoundingClientRect());
      location.href = `oeuvre.html?id=${ARTWORKS[i].id}`;
    } else goFocus(i);
  };
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", () => (drag = null));
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (focus !== null) return leaveFocus();
    cam.tz = clampZ(cam.tz + e.deltaY * 0.004);
  }, { passive: false });
  stage.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowUp") { e.preventDefault(); if (focus !== null) leaveFocus(); cam.tz = clampZ(cam.tz - 1.2); }
    if (k === "ArrowDown") { e.preventDefault(); if (focus !== null) leaveFocus(); cam.tz = clampZ(cam.tz + 1.2); }
    if (k === "ArrowLeft") { e.preventDefault(); cam.tyaw = Math.max(-1.1, cam.tyaw - 0.25); }
    if (k === "ArrowRight") { e.preventDefault(); cam.tyaw = Math.min(1.1, cam.tyaw + 0.25); }
    if (k === "Escape") leaveFocus();
  });
  ui.prev.addEventListener("click", () => goFocus(focus === null ? nearest() : focus - 1));
  ui.next.addEventListener("click", () => goFocus(focus === null ? nearest() : focus + 1));
  ui.back.addEventListener("click", leaveFocus);
  ui.link.addEventListener("click", () => rememberFlight(ARTWORKS[focus].id, el.getBoundingClientRect()));
  window.addEventListener("langchange", showPanel);

  const nearest = () => {
    let best = 0, d = Infinity;
    items.forEach((it, i) => { const dd = Math.abs(it.z - (pose.z - 2)); if (dd < d) { d = dd; best = i; } });
    return best;
  };

  showPanel();

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);
  let last = performance.now(), time = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    time += dt;
    if (focus === null && !animating) {
      cam.z += (cam.tz - cam.z) * Math.min(1, dt * 5);
      cam.yaw += (cam.tyaw - cam.yaw) * Math.min(1, dt * 6);
      pose.z = cam.z;
      pose.yaw = cam.yaw;
      pose.x = 0;
    }
    const bob = reduced ? 0 : Math.sin(time * 1.3) * 0.008;
    camera.position.set(pose.x, EYE + bob, pose.z);
    camera.rotation.set(0, 0, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = -pose.yaw;
    camera.rotation.x = cam.pitch;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
  return { mode: "3d" };
}
