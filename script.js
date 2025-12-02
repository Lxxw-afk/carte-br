const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const newPointBtn = document.getElementById("new-point-btn");
const hintSpan = document.getElementById("hint");

const modal = document.getElementById("marker-create-modal");
const nameInput = document.getElementById("marker-name-input");
const iconSelect = document.getElementById("marker-icon-select");
const modalCancelBtn = document.getElementById("marker-cancel-btn");
const modalSaveBtn = document.getElementById("marker-save-btn");

const markerMenu = document.getElementById("marker-menu");

// --- LISTE DES ICONES DISPONIBLES ---
// ⚠️ Tu dois avoir ces fichiers dans /icons
const ICONS = [
    { id: "", label: "Point rouge (par défaut)", url: "" },

    { id: "meth",      label: "Meth",      url: "icons/Meth.png" },
    { id: "cocaine",   label: "Cocaïne",   url: "icons/cocaine.png" },
    { id: "munitions", label: "Munitions", url: "icons/munitions.png" },
    { id: "organes",   label: "Organes",   url: "icons/organes.png" },
    { id: "weed",      label: "Weed",      url: "icons/weed.png" }
];

  
];

function populateIconSelect() {
  iconSelect.innerHTML = "";
  ICONS.forEach(icon => {
    const opt = document.createElement("option");
    opt.value = icon.id;
    opt.textContent = icon.label;
    iconSelect.appendChild(opt);
  });
}

// --- ÉTATS DE LA CARTE ---
let isDragging = false;
let wasDragging = false;

let startMouseX = 0;
let startMouseY = 0;
let startOffsetX = 0;
let startOffsetY = 0;

let offsetX = 0;
let offsetY = 0;

let zoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// --- MARQUEURS & SAUVEGARDE ---
const STORAGE_KEY = "rp_markers_v4";
let markersData = []; // { id, x, y, name, iconId }
let nextMarkerId = 1;

// Modes
let addingPoint = false;
let pendingPos = null; // {x, y} en attente après clic sur la carte
let movingMarkerId = null;
let contextMarkerId = null;

// --- TRANSFORM (déplacement + zoom) ---
function updateTransform() {
  mapInner.style.transformOrigin = "0 0";
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

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
    nextMarkerId = markersData.reduce((m, d) => Math.max(m, d.id || 0), 0) + 1;
    markersData.forEach(m => createMarkerElement(m));
  } catch (e) {
    console.warn("Impossible de charger les marqueurs :", e);
  }
}

// --- MENU CONTEXTUEL (clic droit sur marqueur) ---
function showMarkerMenu(x, y, markerId) {
  contextMarkerId = markerId;
  markerMenu.style.left = x + "px";
  markerMenu.style.top = y + "px";
  markerMenu.style.display = "block";
}

function hideMarkerMenu() {
  markerMenu.style.display = "none";
  contextMarkerId = null;
}

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

document.addEventListener("click", (e) => {
  if (!markerMenu.contains(e.target)) {
    hideMarkerMenu();
  }
});

// --- MODAL CREATION MARQUEUR ---
function openCreateModal(position) {
  pendingPos = position;
  nameInput.value = "";
  iconSelect.value = "";
  modal.classList.remove("hidden");
  nameInput.focus();
}

function closeCreateModal() {
  modal.classList.add("hidden");
  pendingPos = null;
  addingPoint = false;
  hintSpan.textContent = "";
}

modalCancelBtn.addEventListener("click", () => {
  closeCreateModal();
});

modalSaveBtn.addEventListener("click", () => {
  if (!pendingPos) return;
  const name = nameInput.value.trim();
  const iconId = iconSelect.value;
  addMarker(pendingPos.x, pendingPos.y, name, iconId);
  closeCreateModal();
});

// --- EDITION / DEPLACEMENT / SUPPRESSION MARQUEURS ---
function editMarkerName(markerId) {
  const m = markersData.find(mm => mm.id === markerId);
  if (!m) return;
  const newName = prompt("Nouveau nom du point :", m.name || "");
  if (newName === null) return;
  m.name = newName.trim();

  const label = mapInner.querySelector(`.marker[data-id="${markerId}"] .marker-label`);
  if (label) label.textContent = m.name;
  saveMarkers();
}

function startMoveMarker(markerId) {
  movingMarkerId = markerId;
  addingPoint = false;
  hintSpan.textContent = "Clique sur la carte pour choisir la nouvelle position du point.";
}

function deleteMarker(markerId) {
  markersData = markersData.filter(m => m.id !== markerId);
  const el = mapInner.querySelector(`.marker[data-id="${markerId}"]`);
  if (el) el.remove();
  saveMarkers();
}

// --- CREATION MARQUEUR (données + DOM) ---
function addMarker(x, y, name, iconId) {
  const data = {
    id: nextMarkerId++,
    x,
    y,
    name: name || "",
    iconId: iconId || ""
  };
  markersData.push(data);
  createMarkerElement(data);
  saveMarkers();
}

function createMarkerElement(data) {
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.dataset.id = data.id;
  marker.style.left = data.x + "px";
  marker.style.top = data.y + "px";

  const icon = ICONS.find(i => i.id === data.iconId);

  if (icon && icon.url) {
    const img = document.createElement("img");
    img.src = icon.url;
    img.alt = data.name || icon.label;
    marker.appendChild(img);
  } else {
    const dot = document.createElement("span");
    dot.className = "marker-default";
    marker.appendChild(dot);
  }

  const label = document.createElement("div");
  label.className = "marker-label";
  label.textContent = data.name || "";
  marker.appendChild(label);

  // Clic droit -> menu
  marker.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMarkerMenu(e.clientX, e.clientY, data.id);
  });

  mapInner.appendChild(marker);
}

// --- MOUVEMENT (drag) ---
mapContainer.addEventListener("mousedown", (e) => {
  if (addingPoint || movingMarkerId !== null) return;
  if (e.button !== 0) return;

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

// --- ZOOM MOLETTE (pas sur la barre) ---
mapContainer.addEventListener("wheel", (e) => {
  const isOverTopbar = e.target.closest("#topbar");
  if (isOverTopbar) {
    return;
  }

  e.preventDefault();

  const rect = mapContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldXBefore = (mouseX - offsetX) / zoom;
  const worldYBefore = (mouseY - offsetY) / zoom;

  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  let newZoom = zoom + delta;
  newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  zoom = newZoom;

  offsetX = mouseX - worldXBefore * zoom;
  offsetY = mouseY - worldYBefore * zoom;

  updateTransform();
}, { passive: false });

// --- BOUTON "NOUVEAU POINT" ---
newPointBtn.addEventListener("click", () => {
  addingPoint = true;
  movingMarkerId = null;
  hintSpan.textContent = "Clique sur la carte pour choisir l'emplacement du point.";
});

// --- CLIC SUR LA CARTE ---
mapContainer.addEventListener("click", (e) => {
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  const rect = mapInner.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  if (movingMarkerId !== null) {
    const m = markersData.find(mm => mm.id === movingMarkerId);
    if (m) {
      m.x = x;
      m.y = y;
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

  // On n'ajoute pas encore le marqueur : on ouvre d'abord le menu Nom + Image
  openCreateModal({ x, y });
});

// --- INIT ---
populateIconSelect();
loadMarkers();
updateTransform();






