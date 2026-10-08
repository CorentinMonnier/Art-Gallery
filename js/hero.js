// ─────────────────────────────────────────────────────────────
// Accueil : une toile en 3D (Three.js) qui se peint toute seule,
// projette des gouttes de peinture, puis pivote pour passer à
// l'œuvre suivante. Le site change de couleurs à chaque œuvre.
// Si la 3D n'est pas disponible, on affiche la même peinture en 2D.
// ─────────────────────────────────────────────────────────────

import { Painter } from "./painter.js";
import { ARTWORKS } from "./data.js";
import { applyPalette, L, t } from "./site.js";

const HOLD = 2.4;      // secondes d'arrêt sur l'œuvre terminée
const PAINT = 7.5;     // durée de peinture d'une œuvre

export async function mountHero(stage, caption) {
  const painter = new Painter(720);
  let index = 0;
  let current = ARTWORKS[0];

  const setCaption = () => {
    caption.innerHTML = `<span class="cap-label">${t("hero.painting")}</span>
      <a href="oeuvre.html?id=${current.id}">${L(current.title)}</a>`;
  };
  const begin = (art) => {
    current = art;
    painter.start(art, PAINT);
    applyPalette(art);
    setCaption();
  };
  const next = () => {
    index = (index + 1) % ARTWORKS.length;
    begin(ARTWORKS[index]);
  };
  window.addEventListener("langchange", setCaption);

  // Animations réduites : on montre simplement l'œuvre terminée.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    begin(current);
    painter.finish();
    show2D(stage, painter);
    return;
  }

  let THREE = null;
  try { THREE = await import("three"); } catch { THREE = null; }
  if (THREE && webglAvailable()) {
    try {
      mount3D(THREE, stage, painter, begin, next, () => current);
      return;
    } catch (err) {
      console.warn("3D indisponible, passage en 2D", err);
      stage.querySelector("canvas")?.remove();
    }
  }
  mount2D(stage, painter, begin, next);
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

function visibility(el) {
  const state = { visible: true };
  new IntersectionObserver(([e]) => (state.visible = e.isIntersecting)).observe(el);
  return state;
}

function show2D(stage, painter) {
  painter.canvas.className = "hero-2d";
  stage.append(painter.canvas);
}

function mount2D(stage, painter, begin, next) {
  show2D(stage, painter);
  begin(ARTWORKS[0]);
  const vis = visibility(stage);
  let hold = 0;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (vis.visible && !document.hidden) {
      if (!painter.done) painter.step(dt);
      else if ((hold += dt) > HOLD) { hold = 0; next(); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function mount3D(THREE, stage, painter, begin, next, getCurrent) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = "hero-gl";
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // La toile : une boîte fine (2,4 × 3,6) dont la face avant porte la peinture.
  const W = 2.4, H = 3.6, D = 0.12;
  const texture = new THREE.CanvasTexture(painter.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const edge = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88 });
  const back = new THREE.MeshStandardMaterial({ color: "#D9CDB8", roughness: 1 });
  const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [edge, edge, edge, edge, front, back]);

  // Le châssis en bois, visible quand la toile pivote.
  const wood = new THREE.MeshStandardMaterial({ color: "#B08A5E", roughness: 0.8 });
  const bar = (w, h, x, y) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), wood);
    m.position.set(x, y, -D / 2 - 0.03);
    return m;
  };
  const group = new THREE.Group();
  group.add(canvasMesh,
    bar(W - 0.1, 0.12, 0, H / 2 - 0.11), bar(W - 0.1, 0.12, 0, -H / 2 + 0.11),
    bar(0.12, H - 0.1, W / 2 - 0.11, 0), bar(0.12, H - 0.1, -W / 2 + 0.11, 0),
    bar(W - 0.2, 0.1, 0, 0));
  scene.add(group);

  // Ombre douce au sol, qui respire avec la toile
  const sh = document.createElement("canvas");
  sh.width = sh.height = 128;
  const sg = sh.getContext("2d");
  const grad = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.34)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.5, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -H / 2 - 0.32, 0);
  scene.add(shadow);

  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 3.5, 6);
  scene.add(key);

  // Gouttes de peinture projetées par le pinceau.
  const N = 180;
  const pos = new Float32Array(N * 3).fill(-999);
  const col = new Float32Array(N * 3);
  const vel = Array.from({ length: N }, () => new THREE.Vector3());
  const life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.07, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
  }));
  dots.frustumCulled = false;
  scene.add(dots);
  let cursor = 0;
  const tmp = new THREE.Vector3();
  const tint = new THREE.Color();
  const emit = (count) => {
    const b = painter.brush;
    tmp.set((b.u - 0.5) * W, (0.5 - b.v) * H, D / 2 + 0.02);
    canvasMesh.localToWorld(tmp);
    tint.set(b.color);
    for (let i = 0; i < count; i++) {
      const k = cursor++ % N;
      pos[k * 3] = tmp.x; pos[k * 3 + 1] = tmp.y; pos[k * 3 + 2] = tmp.z;
      col[k * 3] = tint.r; col[k * 3 + 1] = tint.g; col[k * 3 + 2] = tint.b;
      vel[k].set((Math.random() - 0.5) * 1.6, Math.random() * 1.2, 0.6 + Math.random() * 1.2);
      life[k] = 1;
    }
  };

  // Taille : la toile doit toujours tenir dans le cadre, même sur mobile.
  const fit = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max((H * 1.32) / 2 / tan, (W * 1.45) / 2 / (tan * camera.aspect));
    camera.position.set(0, 0.1, dist);
    camera.lookAt(0, -0.12, 0);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    pointer.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    pointer.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
  }, { passive: true });

  const beginWithEdge = (art) => {
    begin(art);
    edge.color.set(art.ground);
    texture.needsUpdate = true;
  };
  const advance = () => {
    next();
    edge.color.set(getCurrent().ground);
    texture.needsUpdate = true;
  };
  beginWithEdge(ARTWORKS[0]);

  const vis = visibility(stage);
  let phase = "paint", timer = 0, spin = 0, swapped = false, time = 0;
  let last = performance.now();
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

  const loop = (now) => {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!vis.visible || document.hidden) return;
    time += dt;

    if (phase === "paint") {
      if (painter.step(dt)) {
        texture.needsUpdate = true;
        emit(2);
      }
      if (painter.done) { phase = "hold"; timer = 0; }
    } else if (phase === "hold") {
      if ((timer += dt) > HOLD) { phase = "spin"; spin = 0; swapped = false; }
    } else if (phase === "spin") {
      spin = Math.min(1, spin + dt / 1.6);
      if (spin >= 0.5 && !swapped) { advance(); swapped = true; }
      if (spin >= 1) phase = "paint";
    }

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    const turn = phase === "spin" ? ease(spin) * Math.PI * 2 : 0;
    group.rotation.y = Math.sin(time * 0.35) * 0.2 + pointer.x * 0.32 + turn;
    group.rotation.x = -pointer.y * 0.14 + Math.sin(time * 0.5) * 0.03;
    group.position.y = Math.sin(time * 0.7) * 0.06;
    shadow.material.opacity = 0.85 - group.position.y * 2.5;
    shadow.scale.setScalar(1 - group.position.y * 0.8);
    group.updateMatrixWorld();

    for (let k = 0; k < N; k++) {
      if (life[k] <= 0) continue;
      life[k] -= dt * 0.9;
      vel[k].y -= 3.2 * dt;
      pos[k * 3] += vel[k].x * dt;
      pos[k * 3 + 1] += vel[k].y * dt;
      pos[k * 3 + 2] += vel[k].z * dt;
      if (life[k] <= 0) pos[k * 3 + 1] = -999;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  };
  requestAnimationFrame(loop);
}
