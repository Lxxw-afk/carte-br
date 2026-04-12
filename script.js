document.addEventListener("DOMContentLoaded", () => {
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const tooltip = document.getElementById("tooltip");
const markerMenu = document.getElementById("marker-menu");

const searchInput = document.getElementById("search-input");

let markers = [];
let selectedMarker = null;

/* ================= SEARCH FIX ================= */
searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();

  markers.forEach(m => {
    const name = (m.dataset.name || "").toLowerCase();
    m.style.display = name.includes(value) ? "block" : "none";
  });
});

/* ================= RIGHT CLICK FIX ================= */
function addMarker(x, y, icon, name) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.name = name;

  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = name;
    tooltip.classList.add("show");
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");
  });

  markerLayer.appendChild(img);
  markers.push(img);
}

/* fermer menu clic droit */
document.addEventListener("click", () => {
  markerMenu.style.display = "none";
});

});

/* ============================================================
   🔐 LOGIN
============================================================ */

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

loginBtn.addEventListener("click", () => {
  const value = document.getElementById("access-code").value.trim();

  if (value === "BRIGADE2026") {
    loginScreen.remove();
    app.classList.remove("hidden");
  } else {
    loginError.textContent = "Code incorrect";
  }
});

/* ============================================================
   🔥 FIREBASE
============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   VARIABLES
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
   🧭 FILTRES CATEGORIES (FIX COMPLET)
============================================================ */

const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

let activeCategories = new Set();

/* =============================
   OUVERTURE / FERMETURE MENU
============================= */

toggleFilterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  filterPanel.classList.toggle("hidden");
});

/* fermer si clic extérieur */
document.addEventListener("click", (e) => {
  if (!filterPanel.contains(e.target) && e.target !== toggleFilterBtn) {
    filterPanel.classList.add("hidden");
  }
});

function buildFilterMenu() {

  const categories = new Set();

  markers.forEach(m => {
    categories.add(m.dataset.category || "Non défini");
  });

  filterPanel.innerHTML = "";

  categories.forEach(cat => {

    if (!activeCategories.has(cat)) {
      activeCategories.add(cat);
    }

    const label = document.createElement("label");

    const text = document.createElement("span");
    text.textContent = cat;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = activeCategories.has(cat);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        activeCategories.add(cat);
      } else {
        activeCategories.delete(cat);
      }
      applyFilters();
    });

    label.appendChild(text);
    label.appendChild(checkbox);
    filterPanel.appendChild(label);
  });

  applyFilters();
}

function applyFilters() {
  markers.forEach(marker => {
    const cat = marker.dataset.category || "Non défini";
    marker.style.display = activeCategories.has(cat) ? "block" : "none";
  });
}

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

  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;

  const mapWidth = mapInner.offsetWidth * scale;
  const mapHeight = mapInner.offsetHeight * scale;

  // limites (empêche de sortir de la map)
  const minX = containerWidth - mapWidth;
  const minY = containerHeight - mapHeight;

  // si map plus petite que écran → centre
  if (mapWidth < containerWidth) {
    posX = (containerWidth - mapWidth) / 2;
  } else {
    posX = Math.min(0, Math.max(minX, posX));
  }

  if (mapHeight < containerHeight) {
    posY = (containerHeight - mapHeight) / 2;
  } else {
    posY = Math.min(0, Math.max(minY, posY));
  }

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

    let size = 26 / scale;
    size = Math.max(18, Math.min(32, size));

    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   MARKERS
============================================================ */

function addMarker(x, y, icon, name, id, category) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.id = id;
  img.dataset.name = name;
  img.dataset.category = category || "Non défini";
  img.dataset.icon = icon;

  img.addEventListener("mouseenter", (e) => {
    tooltip.innerHTML = `
      <img src="icons/${img.dataset.icon}">
      <div>
        <b>${img.dataset.name}</b><br>
        ${img.dataset.category}
      </div>
    `;
    tooltip.classList.add("show");
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");
  });

  img.addEventListener("mousemove", (e) => {
    tooltip.style.left = (e.pageX + 10) + "px";
    tooltip.style.top = (e.pageY + 10) + "px";
  });

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
  buildFilterMenu();
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

