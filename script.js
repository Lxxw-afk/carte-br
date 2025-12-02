const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const newPointBtn = document.getElementById("new-point-btn");
const hintSpan = document.getElementById("hint");

// --- ÉTATS DE LA CARTE ---
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

// --- MARQUEURS & SAUVEGARDE ---
const STORAGE_KEY = "rp_markers_v2";
let markersData = []; // { id, x, y, name }

// pour ID unique
let nextMarkerId = 1;

// modes
let addingPoint = false;
let movingMarkerId = null;

// --- MENU CONTEXTUEL (clic droit) ---
let markerMenu = null;
let contextMarkerId = null;

function createMarkerMenu() {
  markerMenu = document.createElement("div");
  markerMenu.id = "marker-menu";
  markerMenu.innerHTML = `
    <div class="item" data-action="edit">Modifier le nom</div>
    <div class="item" data-action="move">Déplacer le point</div>
    <div class="item" data-action="delete">Supprimer le point</div>
  `;
  document.body.appendChild(markerMenu);

  markerMenu.addEventListener("click", (e) => {
    const action = e.target.dataset.action;
    if (!action || contextMarkerId == null) return;

    if (action === "edit") {
      editMarkerName(contextMarkerId);
    } else if (action === "move") {
      startMoveMarker(contextMarkerId);
    } else if (action === "delete") {
      deleteMarker(contextMarkerId);
    }

    hideMarkerMenu();
  });
}

function showMarkerMenu(x, y, markerId) {
  if (!markerMenu) createMarkerMenu();
  contextMarkerId = markerId;
  markerMenu.style.left = x + "px";
  markerMenu.style.top = y + "px";
  markerMenu.style.display = "block";
}

function hideMarkerMenu() {
  if (markerMenu) {
    markerMenu.style.display = "none";
  }
  contextMarkerId = null;
}

// fermer le menu si on clique ailleurs
document.addEventListener("click", (e) => {
  if (markerMenu && e.button === 0) {
    if (!markerMenu.contains(e.target)) {
      hideMarkerMenu();
    }
  }
});

// --- SAUVEGARDE ---
function saveMarkers() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markersData));
  } catch (e) {
    console.warn("Impossible d'enregistrer les marqueurs :", e);
  }
}

function loadMarkers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;

    markersData = arr;
    // recalcul de nextMarkerId
    nextMarkerId = markersData.reduce((max, m) => Math.max(max, m.id || 0), 0) + 1;

    markersData.forEach(m => {
      createMarkerElement(m);
    });
  } catch (e) {
    console.warn("Impossible de charger les marqueurs :", e);
  }
}

// --- TRANSFORM (déplacement + zoom) ---
function updateTransform() {
  mapInner.style.transformOrigin = "0 0";
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

// --- DEPLACEMENT (DRAG AU CLIC GAUCHE) ---
mapContainer.addEventListener("mousedown", (e) => {
  // si on est en mode ajout ou déplacement de point, on ne drag pas
  if (addingPoint || movingMarkerId !== null) return;
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

// --- ZOOM MOLETTE (PAS SUR LA BARRE DU HAUT) ---
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
  movingMarkerId = null;
  hintSpan.textContent = "Clique sur la carte pour placer un point.";
  hideMarkerMenu();
});

// --- CLIC SUR LA CARTE ---
// Sert soit à poser un nouveau point, soit à déplacer un point en mode "déplacement"
mapContainer.addEventListener("click", (e) => {
  // si on vient juste de drag, on ignore le clic
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  const rect = mapInner.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  if (movingMarkerId !== null) {
    // déplacement d'un point existant
    const markerData = markersData.find(m => m.id === movingMarkerId);
    if (markerData) {
      markerData.x = x;
      markerData.y = y;
      const el = mapInner.querySelector(`.marker[data-id="${movingMarkerId}"]`);
      if (el) {
        el.style.left = x + "px";
        el.style.top = y + "px";
      }
      saveMarkers();
    }
    movingMarkerId = null;
    hintSpan.textContent = "";
    return;
  }

  if (!addingPoint) return;

  // ajout d'un nouveau point
  addMarker(x, y);

  addingPoint = false;
  hintSpan.textContent = "";
});

// --- AJOUT D'UN MARQUEUR (données + DOM) ---
function addMarker(x, y) {
  const data = {
    id: nextMarkerId++,
    x,
    y,
    name: ""  // on ajoutera un vrai nom plus tard
  };
  markersData.push(data);
  createMarkerElement(data);
  saveMarkers();
}

// --- CRÉE L'ÉLÉMENT DOM D'UN MARQUEUR ---
function createMarkerElement(data) {
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.dataset.id = data.id;
  marker.style.left = data.x + "px";
  marker.style.top = data.y + "px";

  // point rouge par défaut
  const dot = document.createElement("span");
  dot.className = "marker-default";
  marker.appendChild(dot);

  // label (optionnel pour l'instant)
  const label = document.createElement("div");
  label.className = "marker-label";
  label.textContent = data.name || ""; // vide pour l'instant
  marker.appendChild(label);

  // clic droit sur le marqueur -> menu
  marker.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMarkerMenu(e.clientX, e.clientY, data.id);
  });

  mapInner.appendChild(marker);
}

// --- MODIFIER NOM ---
function editMarkerName(markerId) {
  const m = markersData.find(mm => mm.id === markerId);
  if (!m) return;

  const newName = prompt("Nouveau nom du point :", m.name || "");
  if (newName === null) return;

  m.name = newName;
  const label = mapInner.querySelector(`.marker[data-id="${markerId}"] .marker-label`);
  if (label) {
    label.textContent = newName;
  }
  saveMarkers();
}

// --- DEPLACER MARQUEUR ---
function startMoveMarker(markerId) {
  movingMarkerId = markerId;
  addingPoint = false;
  hintSpan.textContent = "Clique sur la carte pour choisir la nouvelle position du point.";
}

// --- SUPPRIMER MARQUEUR ---
function deleteMarker(markerId) {
  markersData = markersData.filter(m => m.id !== markerId);
  const el = mapInner.querySelector(`.marker[data-id="${markerId}"]`);
  if (el) el.remove();
  saveMarkers();
}

// --- INITIALISATION ---
loadMarkers();
updateTransform();




