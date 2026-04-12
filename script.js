/* ============================================================
   🔐 SYSTEME DE CONNEXION
============================================================ */
const ACCESS_CODE = "BRIGADE2026";

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", () => {
  const value = document.getElementById("access-code").value.trim();

  if (value === ACCESS_CODE) {
    loginScreen.remove();
    app.classList.remove("hidden");
  } else {
    loginError.textContent = "Code d'accès incorrect";
  }
});

/* ============================================================
   🔥 FIREBASE INIT
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   VARIABLES DOM
============================================================ */
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const step1 = document.getElementById("step1");
const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const pointCategory = document.getElementById("point-category");

const markerMenu = document.getElementById("marker-menu");
const editBtn = document.getElementById("edit-marker");
const moveBtn = document.getElementById("move-marker");
const deleteBtn = document.getElementById("delete-marker");

const tooltip = document.getElementById("tooltip");

/* ============================================================
   🔥 FILTRES CATEGORIES
============================================================ */
const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

let activeCategories = new Set();

/* OUVERTURE MENU FILTRE */
toggleFilterBtn.addEventListener("click", () => {
  filterPanel.classList.toggle("hidden");
});

/* ============================================================
   ICONES
============================================================ */
const iconList = [
  "Meth.png","cocaine.png","Munitions.png","organes.png",
  "Weed.png","Entrepot.png","Acier.png","Heroine.png",
  "LSD.png","bijoux.png","Metal.png","Titane.png","QG.png","criminel.png"
];

iconList.forEach(icon => {
  const opt = document.createElement("option");
  opt.value = icon;
  opt.textContent = icon.replace(".png", "");
  pointIcon.appendChild(opt);
});

/* ============================================================
   VARIABLES CARTE
============================================================ */
let posX = 0, posY = 0;
let scale = 1;
let isDragging = false;

let waitingForPlacement = false;
let moveMode = false;
let editMode = false;

let selectedMarker = null;
let markers = [];
let tempX = 0, tempY = 0;

/* ============================================================
   DRAG
============================================================ */
mapContainer.addEventListener("mousedown", (e) => {
  if (waitingForPlacement || moveMode) return;

  isDragging = true;
  mapContainer.style.cursor = "grabbing";

  mapContainer.dataset.startX = e.clientX - posX;
  mapContainer.dataset.startY = e.clientY - posY;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - mapContainer.dataset.startX;
  posY = e.clientY - mapContainer.dataset.startY;

  updateMap();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.style.cursor = "grab";
});

/* ============================================================
   ZOOM
============================================================ */
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();

  const oldScale = scale;
  scale += (e.deltaY < 0 ? 0.1 : -0.1);
  scale = Math.max(0.5, Math.min(4, scale));

  const mx = e.clientX - posX;
  const my = e.clientY - posY;

  posX -= (mx / oldScale) * (scale - oldScale);
  posY -= (my / oldScale) * (scale - oldScale);

  updateMap();
});

/* ============================================================
   UPDATE MAP
============================================================ */
function updateMap() {
  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;
  updateMarkerDisplay();
}

function updateMarkerDisplay() {
  markers.forEach(marker => {
    const x = parseFloat(marker.dataset.x);
    const y = parseFloat(marker.dataset.y);

    marker.style.left = (x * scale) + "px";
    marker.style.top = (y * scale) + "px";

    let size = 28 / scale;
    size = Math.max(18, Math.min(32, size));

    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   FILTRES LOGIQUE
============================================================ */
function buildFilterMenu() {

  const categories = new Set();

  markers.forEach(m => {
    categories.add(m.dataset.category || "Non défini");
  });

  filterPanel.innerHTML = "";

  categories.forEach(cat => {

    activeCategories.add(cat);

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        activeCategories.add(cat);
      } else {
        activeCategories.delete(cat);
      }
      applyFilters();
    });

    label.appendChild(document.createTextNode(cat));
    label.appendChild(checkbox);

    filterPanel.appendChild(label);
  });
}

function applyFilters() {
  markers.forEach(marker => {
    const cat = marker.dataset.category || "Non défini";
    marker.style.display = activeCategories.has(cat) ? "block" : "none";
  });
}

/* ============================================================
   TOOLTIP
============================================================ */
function showTooltip(marker, e) {
  tooltip.innerHTML = `
    <img src="icons/${marker.dataset.icon}">
    <div>
      <b>${marker.dataset.name}</b><br>
      ${marker.dataset.category}
    </div>
  `;
  tooltip.classList.add("show");
}

function moveTooltip(e) {
  tooltip.style.left = (e.pageX + 12) + "px";
  tooltip.style.top = (e.pageY - 20) + "px";
}

function hideTooltip() {
  tooltip.classList.remove("show");
}

/* ============================================================
   ADD MARKER
============================================================ */
function addMarker(x, y, icon, name, id, category) {

  if (markers.some(m => m.dataset.id === id)) return;

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.icon = icon;
  img.dataset.id = id;
  img.dataset.name = name;
  img.dataset.category = category || "Non défini";

  img.addEventListener("mouseenter", (e) => showTooltip(img, e));
  img.addEventListener("mousemove", moveTooltip);
  img.addEventListener("mouseleave", hideTooltip);

  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);

  updateMarkerDisplay();
  applyFilters();
}

/* ============================================================
   CLICK MAP
============================================================ */
mapContainer.addEventListener("click", (e) => {

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();

  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   SAVE POINT
============================================================ */
document.getElementById("validate-point").onclick = async () => {

  const id = await db.collection("markers").add({
    x: tempX,
    y: tempY,
    icon: pointIcon.value,
    name: pointName.value,
    category: pointCategory.value
  }).then(doc => doc.id);

  addMarker(tempX, tempY, pointIcon.value, pointName.value, id, pointCategory.value);

  pointMenu.classList.add("hidden");
};

/* ============================================================
   CANCEL
============================================================ */
document.getElementById("cancel-point").onclick = () => {
  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
};

/* ============================================================
   FIREBASE REALTIME
============================================================ */
db.collection("markers").onSnapshot(snapshot => {

  markers.forEach(m => m.remove());
  markers = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
  });

  buildFilterMenu();
  applyFilters();
});
