document.addEventListener("DOMContentLoaded", () => {

/* ================= DOM ================= */

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const tooltip = document.getElementById("tooltip");
const markerMenu = document.getElementById("marker-menu");

const step1 = document.getElementById("step1");
const pointMenu = document.getElementById("point-menu");

const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const pointCategory = document.getElementById("point-category");

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

const searchInput = document.getElementById("search-input");
const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

/* ================= LOGIN ================= */

document.getElementById("login-btn").addEventListener("click", () => {
  const value = document.getElementById("access-code").value.trim();

  if (value === "BRIGADE2026") {
    loginScreen.remove();
    app.classList.remove("hidden");
  } else {
    document.getElementById("login-error").textContent = "Code incorrect";
  }
});

/* ================= FIREBASE ================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================= VARIABLES ================= */

let posX = 0;
let posY = 0;
let scale = 1;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

let waitingForPlacement = false;
let tempX = 0;
let tempY = 0;

let markers = [];
let selectedMarker = null;

/* ================= SEARCH ================= */

searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();

  markers.forEach(m => {
    const name = (m.dataset.name || "").toLowerCase();
    m.style.display = name.includes(value) ? "block" : "none";
  });
});

/* ================= FILTER ================= */

let activeCategories = new Set();

toggleFilterBtn.addEventListener("click", () => {
  filterPanel.classList.toggle("hidden");
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
      if (checkbox.checked) activeCategories.add(cat);
      else activeCategories.delete(cat);

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

/* ================= DRAG MAP ================= */

mapContainer.addEventListener("mousedown", (e) => {
  if (waitingForPlacement) return;

  isDragging = true;
  mapContainer.style.cursor = "grabbing";

  dragStartX = e.clientX - posX;
  dragStartY = e.clientY - posY;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - dragStartX;
  posY = e.clientY - dragStartY;

  updateMap();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.style.cursor = "grab";
});

/* ================= ZOOM ================= */

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

/* ================= UPDATE MAP ================= */

function updateMap() {
  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;

  updateMarkers();
}

function updateMarkers() {
  markers.forEach(m => {
    const x = parseFloat(m.dataset.x);
    const y = parseFloat(m.dataset.y);

    m.style.left = (x * scale) + "px";
    m.style.top = (y * scale) + "px";
  });
}

/* ================= ADD MARKER ================= */

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

  img.addEventListener("mouseenter", () => {

    tooltip.innerHTML = `
      <img src="icons/${icon}">
      <div>
        <b>${name}</b><br>
        ${category}
      </div>
    `;

    tooltip.classList.add("show");

    /* 🔥 POSITION SOUS LE POINT */
    const rect = img.getBoundingClientRect();

    tooltip.style.left = rect.left + rect.width / 2 + "px";
    tooltip.style.top = rect.top + "px";
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");
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
/* ================= CLICK MAP ================= */

mapContainer.addEventListener("click", (e) => {

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();

  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  pointMenu.classList.remove("hidden");
});

/* ================= FIREBASE ================= */

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

});
