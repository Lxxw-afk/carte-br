const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const newPointBtn = document.getElementById("new-point-btn");
const hintSpan = document.getElementById("hint");

// --- ÉTATS ---
let isDragging = false;
let wasDragging = false;

let startMouseX = 0;
let startMouseY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

let offsetX = 0;   // déplacement X de la carte
let offsetY = 0;   // déplacement Y de la carte

let zoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Ajout de point : on attend le prochain clic sur la carte
let addingPoint = false;

// --- APPLIQUE LE DÉPLACEMENT + ZOOM ---
function updateTransform() {
  mapInner.style.transformOrigin = "0 0";
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

// --- DEPLACEMENT (DRAG AU CLIC GAUCHE) ---
mapContainer.addEventListener("mousedown", (e) => {
  // si on est en mode ajout de point, on ne drag pas
  if (addingPoint) return;
  if (e.button !== 0) return;       // uniquement clic gauche

  isDragging = true;
  wasDragging = false;
  mapContainer.classList.add("dragging");

  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startOffsetX = offsetX;
  startOffsetY = offsetY;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  wasDragging = true;

  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;

  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;

  updateTransform();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
});

// --- ZOOM MOLETTE (UNIQUEMENT SUR LA CARTE, PAS SUR LA BARRE DU HAUT) ---
mapContainer.addEventListener("wheel", (e) => {
  // Si la souris est sur la topbar (titre + bouton), on ne zoom pas
  const isOverTopbar = e.target.closest("#topbar");
  if (isOverTopbar) {
    return;
  }

  e.preventDefault();

  const rect = mapContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // coord "monde" avant zoom
  const worldXBefore = (mouseX - offsetX) / zoom;
  const worldYBefore = (mouseY - offsetY) / zoom;

  const delta = e.deltaY < 0 ? 0.1 : -0.1; // molette vers soi = zoom +
  let newZoom = zoom + delta;
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  zoom = newZoom;

  // garder le point sous la souris au même endroit visuel
  offsetX = mouseX - worldXBefore * zoom;
  offsetY = mouseY - worldYBefore * zoom;

  updateTransform();
}, { passive: false });

// --- BOUTON "NOUVEAU POINT" ---
// Le prochain clic gauche sur la carte posera un marqueur
newPointBtn.addEventListener("click", () => {
  addingPoint = true;
  hintSpan.textContent = "Clique sur la carte pour placer un point.";
});

// --- CLIC SUR LA CARTE POUR POSER LE MARQUEUR ---
mapContainer.addEventListener("click", (e) => {
  // si on vient juste de drag, on ignore le clic
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  if (!addingPoint) return;

  const rect = mapInner.getBoundingClientRect();

  // coordonnées dans le repère de la carte (avant zoom)
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  createMarker(x, y);

  addingPoint = false;
  hintSpan.textContent = "";
});

// --- CRÉATION D'UN MARQUEUR (SIMPLE POUR L'INSTANT) ---
function createMarker(x, y) {
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.style.left = x + "px";
  marker.style.top = y + "px";

  // petit point par défaut
  const dot = document.createElement("span");
  dot.className = "marker-default";
  marker.appendChild(dot);

  mapInner.appendChild(marker);
}

// position / zoom de départ
updateTransform();


