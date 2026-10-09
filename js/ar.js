// ─────────────────────────────────────────────────────────────
// Réalité augmentée : voir la toile sur son vrai mur avec la
// caméra du téléphone, à la bonne taille.
//
// On fabrique un modèle 3D de la toile (format GLB) directement
// dans le navigateur, puis on l'affiche avec <model-viewer> (Google),
// qui ouvre la réalité augmentée native :
//  - Android (Chrome) : WebXR
//  - iPhone / iPad (Safari) : AR Quick Look
// Sur ordinateur, on peut seulement faire tourner la toile en 3D.
// ─────────────────────────────────────────────────────────────

import { makeCanvas, RATIO } from "./art.js";
import { t } from "./site.js";

const MODEL_VIEWER = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";

let loading = null;
function loadModelViewer() {
  if (customElements.get("model-viewer")) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = MODEL_VIEWER;
    s.onload = () => customElements.whenDefined("model-viewer").then(resolve);
    s.onerror = reject;
    document.head.append(s);
  });
  return loading;
}

// Image de la toile recadrée au format choisi
function croppedCanvas(src, format) {
  const want = format.h / format.w;
  const fx = want >= RATIO ? RATIO / want : 1;
  const fy = want >= RATIO ? 1 : want / RATIO;
  const sw = src.width * fx, sh = src.height * fy;
  const c = makeCanvas(1024, Math.round(1024 * want));
  c.getContext("2d").drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, c.width, c.height);
  return c;
}

// Fabrique le fichier 3D de la toile (taille réelle, en mètres).
async function buildModel(art, format, imgCanvas) {
  const THREE = await import("three");
  const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
  const tex = new THREE.CanvasTexture(croppedCanvas(imgCanvas, format));
  tex.colorSpace = THREE.SRGBColorSpace;
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const edge = new THREE.MeshStandardMaterial({ color: art.ground, roughness: 0.9 });
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(format.w / 100, format.h / 100, 0.02),
    [edge, edge, edge, edge, front, edge],
  );
  mesh.position.z = 0.01;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const glb = await new GLTFExporter().parseAsync(scene, { binary: true });
  return URL.createObjectURL(new Blob([glb], { type: "model/gltf-binary" }));
}

export async function openAR(art, format, imgCanvas) {
  let dlg = document.getElementById("ar-dialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "ar-dialog";
    dlg.className = "ar-dialog glass";
    document.body.append(dlg);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  }
  dlg.innerHTML = `
    <div class="ar-head">
      <h2>${t("ar.title")}</h2>
      <button class="icon-btn" type="button" data-close aria-label="${t("ar.close")}">✕</button>
    </div>
    <div class="ar-stage"><p class="note">${t("ar.loading")}</p></div>
    <p class="note ar-help">${t("ar.help")}</p>`;
  dlg.querySelector("[data-close]").addEventListener("click", () => dlg.close());
  dlg.showModal();

  const stage = dlg.querySelector(".ar-stage");
  try {
    const [, src] = await Promise.all([loadModelViewer(), buildModel(art, format, imgCanvas)]);
    stage.innerHTML = `
      <model-viewer src="${src}" ar ar-modes="webxr quick-look" ar-placement="wall" ar-scale="fixed"
        camera-controls touch-action="pan-y" shadow-intensity="0.6" exposure="1"
        camera-orbit="-20deg 80deg auto" alt="${t("ar.alt")}">
        <button slot="ar-button" class="btn ar-btn" type="button">${t("ar.cta")}</button>
      </model-viewer>`;
    const mv = stage.querySelector("model-viewer");
    mv.addEventListener("load", () => {
      if (!mv.canActivateAR) dlg.querySelector(".ar-help").textContent = t("ar.desktop");
    });
  } catch (err) {
    console.warn("Réalité augmentée indisponible", err);
    stage.innerHTML = `<p class="note">${t("ar.error")}</p>`;
  }
}
