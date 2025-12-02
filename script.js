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

// Pour l'ajout de points
let addingPoint = false;
let pendingMarkerData = null;

// ---- DRAG DEPLACEMENT ----
mapContainer.addEventListener("mousedown", (e) => {
  // Si on est en mode ajout de point, on ne démarre pas le drag
  if (addingPoint) return;

  if (e.button !== 0) return; // bouton gauche seulement
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

  mapInner.style.left = offsetX + "px";
  mapInner.style.top = offsetY + "px";
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
});

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

  // position du clic par rapport à mapInner
  const rect = mapInner.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

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
