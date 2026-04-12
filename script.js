document.addEventListener("DOMContentLoaded", () => {

/* ================= DOM ================= */

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

const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

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

let posX = 0, posY = 0;
let scale = 1;

let isDragging = false;
let dragStartX = 0, dragStartY = 0;

let waitingForPlacement = false;
let moveMode = false;
let editMode = false;

let tempX = 0, tempY = 0;

let selectedMarker = null;

let markers = [];

/* ================= CATEGORIES ================= */

let activeCategories = new Set();

/* ================= TOGGLE MENU ================= */

toggleFilterBtn.addEventListener("click", () => {
  filterPanel.classList.toggle("show");
});

/* ================= BUILD MENU ================= */

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

    const count = markers.filter(m => (m.dataset.category || "Non défini") === cat).length;

    const text = document.createElement("span");
    text.textContent = `${cat} (${count})`;

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
}

/* ================= APPLY FILTER ================= */

function applyFilters() {
  markers.forEach(marker => {
    const cat = marker.dataset.category || "Non défini";
    marker.style.display = activeCategories.has(cat) ? "block" : "none";
  });
}

/* ================= DRAG MAP ================= */

mapContainer.addEventListener("mousedown", (e) => {
  if (waitingForPlacement || moveMode) return;

  isDragging = true;
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
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;
  updateMarkers();
}

/* ================= MARKERS ================= */

function updateMarkers() {
  markers.forEach(m => {
    const x = parseFloat(m.dataset.x);
    const y = parseFloat(m.dataset.y);

    m.style.left = (x * scale) + "px";
    m.style.top = (y * scale) + "px";

    let size = 26 / scale;
    size = Math.max(18, Math.min(32, size));

    m.style.width = size + "px";
    m.style.height = size + "px";
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
  img.dataset.icon = icon;
  img.dataset.name = name;
  img.dataset.category = category || "Non défini";

  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `
      <img src="icons/${icon}">
      <div>
        <b>${name}</b><br>
        ${category}
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

  updateMarkers();
  buildFilterMenu();
  applyFilters();
}

/* ================= NEW POINT ================= */

document.getElementById("new-point-btn").addEventListener("click", () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
});

/* ================= PLACE POINT ================= */

mapContainer.addEventListener("click", (e) => {

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();

  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ================= VALIDATE ================= */

document.getElementById("validate-point").addEventListener("click", async () => {

  const name = pointName.value;
  const icon = pointIcon.value;
  const cat = pointCategory.value;

  const doc = await db.collection("markers").add({
    x: tempX,
    y: tempY,
    icon,
    name,
    category: cat
  });

  addMarker(tempX, tempY, icon, name, doc.id, cat);

  pointMenu.classList.add("hidden");
});

/* ================= FIRESTORE ================= */

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
