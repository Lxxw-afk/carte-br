const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const newPointBtn = document.getElementById("new-point-btn");
const hintSpan = document.getElementById("hint");

// --- ÉTAT ---
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

let addingPoint = false;
let pendingMarkerData = null;

// --- APPLIQUE LE DÉPLACEMENT + ZOOM ---
function updateTransform() {
  mapInner.style.transformOrigin = "0 0";
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

// --- DRAG (déplacement au clic gauche) ---
mapContainer.addEventListener("mousedown", (e) => {
  if (addingPoint) return;          // si on ajoute un point, on ne drag pas
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

// --- ZOOM MOLETTE ---
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();

  const rect = mapContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // coordonnée "monde" avant zoom
  const worldXBefore = (mouseX - offsetX) / zoom;
  const worldYBefore = (mouseY - offsetY) / zoom;

  const delta = e.deltaY < 0 ? 0.1 : -0.1; // molette vers soi = zoom +
  let newZoom = zoom + delta;
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

  // facteur de zoom
  zoom = newZoom;

  // on recalcule offset pour garder le point sous la souris
  offsetX = mouseX - worldXBefore * zoom;
  offsetY = mouseY - worldYBefore * zoom;

  updateTransform();
}, { passive: false });

// --- BOUTON "NOUVEAU POINT" ---
newPointBtn.addEventListener("click", () => {
  const name = prompt("Nom du point :");
  if (!name) return;

  const imageUrl = prompt("URL de l'icône (laisser vide pour une icône par défaut) :") || "";

  pendingMarkerData = { name, imageUrl };
  addingPoint = true;
  hintSpan.textContent = "Clique sur la carte pour placer le point.";
});

// --- CLIC POUR POSER LE MARQUEUR ---
mapContainer.addEventListener("click", (e) => {
  // si on vient juste de drag, on ignore le clic
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  if (!addingPoint || !pendingMarkerData) return;

  const rect = mapInner.getBoundingClientRect();

  // coordonnées dans le repère de la carte (avant zoom)
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  createMarker(x, y, pendingMarkerData);

  addingPoint = false;
  pendingMarkerData = null;
  hintSpan.textContent = "";
});

// --- CRÉATION D'UN MARQUEUR ---
function createMarker(x, y, data) {
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.style.left = x + "px";
  marker.style.top = y + "px";

  if (data.imageUrl && data.imageUrl.trim() !== "") {
    const img = document.createElement("img");
    img.src = data.imageUrl;
    img.alt = data.name;
    marker.appendChild(img);
  } else {
    const dot = document.createElement("span");
    dot.className = "marker-default";
    marker.appendChild(dot);
  }

  const label = document.createElement("div");
  label.className = "marker-label";
  label.textContent = data.name;
  marker.appendChild(label);

  mapInner.appendChild(marker);
}

// position / zoom de départ
updateTransform();

