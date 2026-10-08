// ─────────────────────────────────────────────────────────────
// Accueil : le manège 3D de toiles (Three.js + GSAP).
//
// - Les toiles sont disposées en cercle autour d'un centre invisible.
// - Le manège avance tout seul d'une toile toutes les quelques secondes.
// - On le fait tourner en glissant (doigt ou souris) : il garde de
//   l'élan, ralentit, puis s'arrête pile sur une toile.
// - La toile de face s'avance et grandit. Un clic dessus ouvre sa page.
// - Si la 3D n'est pas disponible, on affiche une rangée de toiles
//   qui défile horizontalement.
// ─────────────────────────────────────────────────────────────

import { ARTWORKS } from "./data.js";
import { renderArtwork, makeCanvas, RATIO } from "./art.js";
import { applyPalette, L, t, price, minPrice, cardHTML } from "./site.js";

const AUTO_DELAY = 4.5;   // secondes entre deux avancées automatiques
const RESUME_AFTER = 6;   // l'auto-rotation reprend X s après la dernière interaction

// Animation : GSAP si chargé, sinon une petite interpolation maison.
function tween(target, vars) {
  if (window.gsap) return window.gsap.to(target, vars);
  const keys = Object.keys(vars).filter((k) => !["duration", "ease", "onUpdate", "onComplete"].includes(k));
  const from = Object.fromEntries(keys.map((k) => [k, target[k]]));
  const dur = (vars.duration ?? 0.8) * 1000;
  const start = performance.now();
  let killed = false;
  const step = (now) => {
    if (killed) return;
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - (1 - p) ** 3;
    keys.forEach((k) => (target[k] = from[k] + (vars[k] - from[k]) * e));
    vars.onUpdate?.();
    if (p < 1) requestAnimationFrame(step); else vars.onComplete?.();
  };
  requestAnimationFrame(step);
  return { kill: () => (killed = true) };
}

export async function mountCarousel(stage, ui) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let THREE = null;
  try { THREE = await import("three"); } catch { THREE = null; }
  if (!THREE || !webglAvailable()) return mountFallback(stage, ui);
  try {
    return mount3D(THREE, stage, ui, reduced);
  } catch (err) {
    console.warn("3D indisponible, passage en 2D", err);
    stage.querySelector("canvas")?.remove();
    return mountFallback(stage, ui);
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

// Met à jour le cartel (titre, prix, lien) de la toile mise en avant.
function updateCaption(ui, art) {
  ui.title.textContent = L(art.title);
  ui.price.textContent = `${t("card.from")} ${price(minPrice())}`;
  ui.link.href = `oeuvre.html?id=${art.id}`;
  ui.panel.classList.remove("swap");
  void ui.panel.offsetWidth; // relance l'animation CSS
  ui.panel.classList.add("swap");
}

function mount3D(THREE, stage, ui, reduced) {
  const N = ARTWORKS.length;
  const STEP = (Math.PI * 2) / N;
  const R = 3.7;                        // rayon du manège
  const CW = 1.2, CH = CW * RATIO, CD = 0.05;  // taille d'une toile

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = "ring-gl";
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  // Lumières : un ciel doux + un soleil qui projette les ombres au sol.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9dc, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(3, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Sol invisible qui ne garde que les ombres (fond transparent).
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.13 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -CH / 2 - 0.35;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ombre de contact très douce sous la toile de face.
  const blob = (() => {
    const c = makeCanvas(128, 128);
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(0,0,0,0.28)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, floor.position.y + 0.002, R + 0.4);
    scene.add(m);
    return m;
  })();

  // Le manège
  const ring = new THREE.Group();
  scene.add(ring);
  const back = new THREE.MeshStandardMaterial({ color: "#E9E6E0", roughness: 1 });
  const items = ARTWORKS.map((art, i) => {
    const c = makeCanvas(512, Math.round(512 * RATIO));
    renderArtwork(c.getContext("2d"), art, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const edge = new THREE.MeshStandardMaterial({ color: art.ground, roughness: 0.9 });
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, CD), [edge, edge, edge, edge, front, back]);
    mesh.castShadow = true;
    mesh.userData.index = i;
    const pivot = new THREE.Group();          // tourne avec le manège
    const angle = i * STEP;
    pivot.rotation.y = angle;
    mesh.position.z = R;
    pivot.add(mesh);
    ring.add(pivot);
    return { art, mesh, pivot, angle, focus: 0 };
  });

  // État de rotation : `rot` = combien de toiles ont défilé (en radians).
  const state = { rot: 0 };
  let active = 0;
  let snapTween = null;

  const indexAt = (rot) => ((Math.round(rot / STEP) % N) + N) % N;

  const goTo = (targetRot, duration) => {
    snapTween?.kill();
    snapTween = tween(state, {
      rot: targetRot,
      duration,
      ease: "power3.out",
      onComplete: () => settle(),
    });
  };
  const settle = () => {
    const i = indexAt(state.rot);
    if (i !== active || !ui.ready) {
      active = i;
      ui.ready = true;
      updateCaption(ui, ARTWORKS[i]);
      applyPalette(ARTWORKS[i], { persist: false });
    }
  };
  const next = (dir = 1) => goTo(Math.round(state.rot / STEP) * STEP + dir * STEP, 1.1);

  // Cadrage : la toile de face doit bien remplir l'écran, sur mobile comme sur ordinateur.
  const look = new THREE.Vector3(0, -0.15, R * 0.45);
  const fit = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const portrait = camera.aspect < 0.8;
    const fh = (CH * 1.32) / (2 * tan * (portrait ? 0.52 : 0.56));
    const fw = (CW * 1.32) / (2 * tan * camera.aspect * (portrait ? 0.46 : 0.3));
    const d = Math.max(fh, fw);
    camera.position.set(0, 1.05, R + 0.5 + d);
    look.set(0, portrait ? -0.05 : -0.15, R * 0.45);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  // ── Interaction : glisser, élan, arrêt ───────────────────────
  const el = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const meshes = items.map((it) => it.mesh);
  let drag = null;
  let lastInteraction = -Infinity;
  let hoverStage = false;

  const hit = (e) => {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(meshes, false)[0]?.object.userData.index ?? null;
  };

  el.addEventListener("pointerdown", (e) => {
    snapTween?.kill();
    drag = { x: e.clientX, y: e.clientY, rot: state.rot, t: performance.now(), vel: 0, lastX: e.clientX, moved: 0 };
    el.setPointerCapture(e.pointerId);
    lastInteraction = performance.now();
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) {
      if (e.pointerType === "mouse") el.style.cursor = hit(e) !== null ? "pointer" : "grab";
      return;
    }
    const now = performance.now();
    const dx = e.clientX - drag.lastX;
    const perPx = STEP / Math.max(180, stage.clientWidth * 0.32);
    state.rot -= dx * perPx;
    const dt = Math.max(1, now - drag.t) / 1000;
    drag.vel = drag.vel * 0.7 + ((-dx * perPx) / dt) * 0.3;
    drag.t = now;
    drag.lastX = e.clientX;
    drag.moved += Math.abs(dx) + Math.abs(e.clientY - drag.y) * 0;
  });
  const release = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    lastInteraction = performance.now();
    if (d.moved < 6) {
      // Simple clic : la toile de face ouvre sa page, une autre vient au centre.
      const i = hit(e);
      if (i === null) return goTo(Math.round(state.rot / STEP) * STEP, 0.6);
      if (i === active && Math.abs(state.rot - Math.round(state.rot / STEP) * STEP) < 0.05) return open(i);
      const cur = Math.round(state.rot / STEP);
      let delta = ((i - indexAt(state.rot)) % N + N) % N;
      if (delta > N / 2) delta -= N;
      return goTo((cur + delta) * STEP, 1.0);
    }
    const projected = state.rot + d.vel * 0.45;
    const target = Math.round(projected / STEP) * STEP;
    const dist = Math.abs(target - state.rot);
    goTo(target, Math.min(1.8, 0.7 + dist * 0.5));
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  stage.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hoverStage = true; });
  stage.addEventListener("pointerleave", () => (hoverStage = false));

  // Ouvrir la page produit avec un petit zoom
  const open = (i) => {
    const art = ARTWORKS[i];
    const go = () => (location.href = `oeuvre.html?id=${art.id}`);
    if (reduced) return go();
    tween(camera.position, { z: camera.position.z - 2.2, y: camera.position.y - 0.3, duration: 0.45, ease: "power2.in", onComplete: go });
  };

  // Boutons précédent / suivant / pause (clavier et accessibilité)
  let paused = reduced;
  ui.prev.addEventListener("click", () => { lastInteraction = performance.now(); next(-1); });
  ui.next.addEventListener("click", () => { lastInteraction = performance.now(); next(1); });
  const syncPause = () => {
    ui.pause.setAttribute("aria-pressed", String(paused));
    ui.pause.querySelector("[data-icon]").textContent = paused ? "▶" : "❚❚";
    ui.pause.setAttribute("aria-label", t(paused ? "home.ring.play" : "home.ring.pause"));
  };
  ui.pause.addEventListener("click", () => { paused = !paused; syncPause(); });
  syncPause();
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); next(-1); }
  });
  window.addEventListener("langchange", () => { updateCaption(ui, ARTWORKS[active]); syncPause(); });

  // Visibilité : on ne calcule rien quand le manège n'est pas à l'écran.
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);

  // Parallaxe légère avec la souris
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  settle();
  let autoTimer = 0;
  let last = performance.now();
  let time = 0;
  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    time += dt;

    // Avancée automatique
    const idle = !drag && !hoverStage && !paused && now - lastInteraction > RESUME_AFTER * 1000;
    if (idle) {
      autoTimer += dt;
      if (autoTimer > AUTO_DELAY) { autoTimer = 0; next(1); }
    } else autoTimer = 0;

    ring.rotation.y = -state.rot;

    // Mise en avant : la toile la plus proche du centre s'avance et grandit.
    items.forEach((it) => {
      let diff = (it.angle - state.rot) % (Math.PI * 2);
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      const target = Math.max(0, 1 - Math.abs(diff) / (STEP * 0.75));
      it.focus += (target - it.focus) * Math.min(1, dt * 8);
      const f = it.focus * it.focus * (3 - 2 * it.focus);
      const s = 1 + 0.32 * f;
      it.mesh.scale.set(s, s, 1);
      it.mesh.position.z = R + 0.45 * f;
      it.mesh.position.y = 0.12 * f + Math.sin(time * 1.2 + it.angle * 3) * 0.02;
      it.mesh.rotation.y = -diff * 0.25 * (1 - f);
    });
    blob.material.opacity = Math.max(...items.map((it) => it.focus));

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    ring.rotation.x = pointer.y * 0.03;
    ring.position.x = pointer.x * 0.12;

    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
  return { mode: "3d" };
}

// ── Secours sans 3D : une rangée de toiles qui défile ─────────
function mountFallback(stage, ui) {
  stage.classList.add("ring-fallback");
  const row = document.createElement("div");
  row.className = "ring-row";
  row.innerHTML = ARTWORKS.map(cardHTML).join("");
  (stage.querySelector(".ring-intro") || stage).after(row);
  ui.controls.hidden = true;
  ui.panel.hidden = true;
  window.addEventListener("langchange", () => (row.innerHTML = ARTWORKS.map(cardHTML).join("")));
  return { mode: "2d" };
}
