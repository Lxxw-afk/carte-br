// ============================
// RÉFÉRENCES DOM
// ============================

const mapContainer = document.getElementById("map-container");
const mapInner      = document.getElementById("map-inner");
const mapImg        = document.getElementById("map");
const markerLayer   = document.getElementById("marker-layer");

const newPointBtn   = document.getElementById("new-point-btn");
const hintSpan      = document.getElementById("hint");

const modal         = document.getElementById("marker-create-modal");
const nameInput     = document.getElementById("marker-name-input");
const iconSelect    = document.getElementById("marker-icon-select");
const modalCancel   = document.getElementById("marker-cancel-btn");
const modalSave     = document.getElementById("marker-save-btn");

const markerMenu    = document.getElementById("marker-menu");

// Référence Firebase (db est créée dans index.html)
const markersRef    = db.ref("markers");


// ============================
// LISTE D'ICÔNES DISPONIBLES
// ============================

const ICONS = [
  { id: "",         label: "Point rouge (par défaut)", url: "" },
  { id: "Meth",     label: "Meth",      url: "icons/Meth.png" },
  { id: "cocaine",  label: "Cocaïne",   url: "icons/cocaine.png" },
  { id: "munitions",label: "Munitions", url: "icons/munitions.png" },
  { id: "organes",  label: "Organes",   url: "icons/organes.png" },
  { id: "weed",     label: "Weed",      url: "icons/weed.png" },
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


// ============================
// ÉTAT DE LA CARTE (DEPLACEMENT / ZOOM)
// ============================

let isDragging      = false;
let wasDragging     = false;
let startMouseX     = 0;
let startMouseY     = 0;
let startOffsetX    = 0;
let startOffsetY    = 0;

let offsetX         = 0;
let offsetY         = 0;
let zoom            = 1;
const MIN_ZOOM      = 0.4;
const MAX_ZOOM      = 3;


// ============================
// ÉTAT DES MARQUEURS
// ============================

const markersData   = {}; // id Firebase -> data

let addingPoint     = false;
let pendingPos      = null;
let movingMarkerId  = null;
let contextMarkerId = null;


// ============================
// TRANSFORM : DÉPLACEMENT + ZOOM
// ============================

function updateTransform() {
  const transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

  mapInner.style.transformOrigin    = "0 0";
  markerLayer.style.transformOrigin = "0 0";

  mapInner.style.transform    = transform;
  markerLayer.style.transform = transform;

  // compensation de taille pour les marqueurs
  const markerScale = 1 / zoom;
  markerLayer.style.setProperty("--markerScale", markerScale);
}

// ============================
// Déplacement au vrai "clic maintenu"
// ============================

// Quand on appuie sur le clic gauche → commencer à drag
mapContainer.addEventListener("mousedown", (e) => {
  // Pas de drag si on clique sur UI
  if (e.target.closest("#topbar, #marker-create-modal, #marker-menu")) return;
  if (e.button !== 0) return;

  isDragging = true;
  wasDragging = false;

  startMouseX = e.clientX;
  startMouseY = e.clientY;

  startOffsetX = offsetX;
  startOffsetY = offsetY;

  mapContainer.classList.add("dragging");
});

// Tant que le clic est maintenu → déplacer
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    wasDragging = true;
  }

  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;

  updateTransform();
});

// Quand on relâche le clic → arrêter le drag
document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
});


document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;

  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    wasDragging = true;
  }

  offsetX = startOffsetX + dx;
  offsetY = startOffsetY + dy;

  updateTransform();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.classList.remove("dragging");
});

// Zoom molette
mapContainer.addEventListener("wheel", (e) => {
  const overTopbar = e.target.closest("#topbar");
  if (overTopbar) return;

  e.preventDefault();

  const rect   = mapContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldXBefore = (mouseX - offsetX) / zoom;
  const worldYBefore = (mouseY - offsetY) / zoom;

  const delta  = e.deltaY < 0 ? 0.1 : -0.1;
  let newZoom  = zoom + delta;
  newZoom      = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  zoom         = newZoom;

  offsetX = mouseX - worldXBefore * zoom;
  offsetY = mouseY - worldYBefore * zoom;

  updateTransform();
}, { passive: false });


// ============================
// MARQUEURS : DOM
// ============================

function createOrUpdateMarkerElement(id, data) {
  let marker = markerLayer.querySelector(`.marker[data-id="${id}"]`);

  if (!marker) {
    marker = document.createElement("div");
    marker.className = "marker";
    marker.dataset.id = id;

    marker.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showMarkerMenu(e.clientX, e.clientY, id);
    });

    markerLayer.appendChild(marker);
  }

  marker.innerHTML = "";
  marker.style.left = data.x + "px";
  marker.style.top  = data.y + "px";

  const iconDef = ICONS.find(i => i.id === data.iconId);

  if (iconDef && iconDef.url) {
    const img = document.createElement("img");
    img.src = iconDef.url;
    img.alt = data.name || iconDef.label;
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
}


// ============================
// FIREBASE : SYNC TEMPS RÉEL
// ============================

function initFirebaseSync() {
  markersRef.on("child_added", (snap) => {
    const id   = snap.key;
    const data = snap.val();
    markersData[id] = data;
    createOrUpdateMarkerElement(id, data);
  });

  markersRef.on("child_changed", (snap) => {
    const id   = snap.key;
    const data = snap.val();
    markersData[id] = data;
    createOrUpdateMarkerElement(id, data);
  });

  markersRef.on("child_removed", (snap) => {
    const id = snap.key;
    delete markersData[id];
    const el = markerLayer.querySelector(`.marker[data-id="${id}"]`);
    if (el) el.remove();
  });
}


// ============================
// ACTIONS MARQUEURS
// ============================

function addMarkerToDB(x, y, name, iconId) {
  const newRef = markersRef.push();
  newRef.set({
    x,
    y,
    name:   name || "",
    iconId: iconId || ""
  });
}

function editMarkerName(id) {
  const current = markersData[id];
  if (!current) return;

  const newName = prompt("Nouveau nom :", current.name || "");
  if (newName === null) return;

  markersRef.child(id).update({ name: newName.trim() });
}

function startMoveMarker(id) {
  if (!markersData[id]) return;
  movingMarkerId = id;
  addingPoint    = false;
  hintSpan.textContent = "Clique sur la carte pour choisir la nouvelle position.";
}

function deleteMarker(id) {
  markersRef.child(id).remove();
}


// ============================
// MENU CLIC DROIT
// ============================

function showMarkerMenu(x, y, markerId) {
  contextMarkerId = markerId;
  markerMenu.style.left   = x + "px";
  markerMenu.style.top    = y + "px";
  markerMenu.style.display = "block";
}

function hideMarkerMenu() {
  markerMenu.style.display = "none";
  contextMarkerId = null;
}

markerMenu.addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action || !contextMarkerId) return;

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


// ============================
// MODALE "NOUVEAU POINT"
// ============================

function openCreateModal(pos) {
  pendingPos = pos;
  nameInput.value = "";
  iconSelect.value = "";
  modal.classList.remove("hidden");
  nameInput.focus();
}

function closeCreateModal() {
  modal.classList.add("hidden");
  pendingPos   = null;
  addingPoint  = false;
  hintSpan.textContent = "";
}

modalCancel.addEventListener("click", () => {
  closeCreateModal();
});

modalSave.addEventListener("click", () => {
  if (!pendingPos) return;

  const name   = nameInput.value.trim();
  const iconId = iconSelect.value;

  addMarkerToDB(pendingPos.x, pendingPos.y, name, iconId);
  closeCreateModal();
});


// ============================
// BOUTON "NOUVEAU POINT"
// ============================

newPointBtn.addEventListener("click", () => {
  addingPoint    = true;
  movingMarkerId = null;
  hintSpan.textContent = "Clique sur la carte pour placer le point.";
});


// ============================
// CLIC SUR LA CARTE
// ============================

mapContainer.addEventListener("click", (e) => {
  // si on vient de drag, on ignore ce clic
  if (wasDragging) {
    wasDragging = false;
    return;
  }

  const rect = mapInner.getBoundingClientRect();
  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top)  / zoom;

  // Déplacement d'un marqueur
  if (movingMarkerId) {
    markersRef.child(movingMarkerId).update({ x, y });
    movingMarkerId = null;
    hintSpan.textContent = "";
    return;
  }

  // Création d'un nouveau point
  if (!addingPoint) return;
  openCreateModal({ x, y });
});


// ============================
// INIT
// ============================

populateIconSelect();
updateTransform();
initFirebaseSync();




