const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const newPointBtn = document.getElementById("new-point-btn");
const hintSpan = document.getElementById("hint");

let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;   // position actuelle de mapInner.left
let offsetY = 0;   // position actuelle de mapInner.top
let wasDragging = false;

// Zoom
let zoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// Ajout de points
let addingPoint = false;
let pendingMarkerData = null;

// --- FONCTION COMMUNE POUR APPLIQUER POSITION + ZOOM ---
function updateTransform() {
  mapInner.style.left = offsetX + "px";
  mapInner.style.top = offsetY + "px";
  mapInner.style.transform = `scale(${zoom})`;
  mapInner.style.transformOrigin = "0 0";
}

// ---- DEPLACEMENT (DRAG) ----
mapContainer.addEventListener("mousedown", (e) => {
  // si on est en mode ajout de point, on ne drag pas
  if (addingPoint) return;
  if (e.button !== 0) return; // bouton gauche uniquement

  isDragging = true;
  wasDragging = false;
  mapContainer.classList.add("dragging");

  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  wasDragging = true;

  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;

  updateTransform();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
});

// ---- ZOOM AVEC LA MOLETTE ----
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();

  const delta = e.deltaY > 0 ? -0.1 : 0.1; // molette vers le haut = zoom +
  const oldZoom = zoom;

  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));

  // (option simple) on zoome depuis le coin haut-gauche
  // Si tu veux, on pourra plus tard centrer le zoom sur la souris.

  updateTransform();
}, { passive: false });

// ---- BOUTON NOUVEAU POINT ----
newPointBtn.addEventListener("click", () => {
  const name = prompt("Nom du point :");
  if (!name) {
    return;
  }

  const imageUrl = prompt("URL de l'icône (laisser vide pour une icône par défaut) :") || "";

  pendingMarkerData = { name, imageUrl };
  addingPoint = true;
  hintSpan.textContent = "Clique sur la carte pour placer le point.";
});

// ---- CLIC POUR PLACER LE POINT ----
mapContainer.addEventListener("click", (e) => {
  // Si on vient de drag, on ignore le clic
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  if (!addingPoint || !pendingMarkerData) return;

  // position du clic par rapport à mapInner (qui est zoomé)
  const rect = mapInner.getBoundingClientRect();

  // coordonnée dans le repère "non zoomé" de la carte
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  createMarker(x, y, pendingMarkerData);

  // reset
  addingPoint = false;
  pendingMarkerData = null;
  hintSpan.textContent = "";
});

// ---- CREATION D'UN MARQUEUR ----
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
    // petit point par défaut
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

// Initialiser la position / zoom
updateTransform();

