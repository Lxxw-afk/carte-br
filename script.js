// =======================
// VARIABLES GLOBALES
// =======================

const map = document.getElementById("map");
const markersContainer = document.getElementById("markers");
const newPointBtn = document.getElementById("newPointBtn");
const pointForm = document.getElementById("pointForm");
const pointNameInput = document.getElementById("pointName");
const pointIconSelect = document.getElementById("pointIcon");
const pointCancelBtn = document.getElementById("cancelPoint");

let isPlacingPoint = false;
let markersData = []; // { id, x, y, name, iconId }
let nextMarkerId = 1;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

// =======================
// SAUVEGARDE DES MARQUEURS
// =======================

const STORAGE_KEY = "carte_rp_markers";

function saveMarkers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(markersData));
}

function loadMarkers() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return;

  try {
    markersData = JSON.parse(raw);
  } catch {
    console.warn("Erreur JSON - réinitialisation des marqueurs");
    markersData = [];
    return;
  }

  nextMarkerId = markersData.reduce((m, e) => Math.max(m, e.id), 0) + 1;

  markersData.forEach(m => createMarkerElement(m));
}

// =======================
// GESTION ZOOM & DEPLACEMENT
// =======================

function updateTransform() {
  map.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

map.addEventListener("mousedown", e => {
  if (isPlacingPoint) return;
  isDragging = true;
  dragStartX = e.clientX - offsetX;
  dragStartY = e.clientY - offsetY;
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

window.addEventListener("mousemove", e => {
  if (!isDragging) return;
  offsetX = e.clientX - dragStartX;
  offsetY = e.clientY - dragStartY;
  updateTransform();
});

// Zoom molette
window.addEventListener("wheel", e => {
  e.preventDefault();
  const zoomSpeed = 0.1;
  scale += e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  scale = Math.min(Math.max(scale, 0.2), 4);
  updateTransform();
}, { passive: false });

// =======================
// CREATION DES MARQUEURS
// =======================

function createMarkerElement(data) {
  const el = document.createElement("img");
  el.className = "marker";
  el.src = `icons/${data.iconId}`;
  el.style.left = data.x + "px";
  el.style.top = data.y + "px";
  el.dataset.id = data.id;
  el.title = data.name;

  // clic droit → menu gestion
  el.addEventListener("contextmenu", e => {
    e.preventDefault();
    openMarkerMenu(data.id, e.clientX, e.clientY);
  });

  markersContainer.appendChild(el);
}

function addMarker(x, y, name, iconId) {
  const m = {
    id: nextMarkerId++,
    x, y,
    name,
    iconId
  };

  markersData.push(m);
  createMarkerElement(m);
  saveMarkers();
}

// =======================
// MENU CLIC-DROIT MARQUEUR
// =======================

function openMarkerMenu(id, px, py) {
  const menu = document.createElement("div");
  menu.className = "markerMenu";
  menu.style.left = px + "px";
 menu.style.top = py + "px";

  menu.innerHTML = `
    <button onclick="editMarker(${id})">Modifier</button>
    <button onclick="deleteMarker(${id})">Supprimer</button>
  `;

  document.body.appendChild(menu);

  const close = () => menu.remove();
  setTimeout(() => window.addEventListener("click", close, { once: true }));
}

function deleteMarker(id) {
  markersData = markersData.filter(m => m.id !== id);
  saveMarkers();
  document.querySelector(`img[data-id="${id}"]`)?.remove();
}

function editMarker(id) {
  alert("La modification sera ajoutée plus tard 😉");
}

// =======================
// MODE AJOUT DE POINT
// =======================

newPointBtn.addEventListener("click", () => {
  isPlacingPoint = true;
  newPointBtn.style.background = "#444";
  pointForm.classList.add("visible");
});

pointCancelBtn.addEventListener("click", () => {
  stopPlacingPoint();
});

function stopPlacingPoint() {
  isPlacingPoint = false;
  newPointBtn.style.background = "";
  pointForm.classList.remove("visible");
}

// clic pour placer un point
map.addEventListener("click", e => {
  if (!isPlacingPoint) return;

  const rect = map.getBoundingClientRect();
  const x = (e.clientX - rect.left - offsetX) / scale;
  const y = (e.clientY - rect.top - offsetY) / scale;

  const name = pointNameInput.value.trim();
  const icon = pointIconSelect.value;

  if (!name || !icon) {
    alert("Veuillez choisir un nom et une icône.");
    return;
  }

  addMarker(x, y, name, icon);
  stopPlacingPoint();
});

// =======================
// CHARGEMENT DES ICONES
// =======================

function populateIconSelect() {
  const icons = [
    "Meth.png",
    "cocaine.png",
    "munitions.png",
    "organes.png",
    "weed.png"
  ];

  icons.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i.replace(".png","");
    pointIconSelect.appendChild(opt);
  });
}

// =======================
// INITIALISATION
// =======================

populateIconSelect();
loadMarkers();
updateTransform();






