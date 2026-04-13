document.addEventListener("DOMContentLoaded", () => {

/* ============================================================
   DOM
============================================================ */

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

const editBtn = document.getElementById("edit-marker");
const moveBtn = document.getElementById("move-marker");
const deleteBtn = document.getElementById("delete-marker");

const validateBtn = document.getElementById("validate-point");
const cancelBtn = document.getElementById("cancel-point");
const newPointBtn = document.getElementById("new-point-btn");

const searchInput = document.getElementById("search-input");
const suggestionBox = document.getElementById("search-suggestions");

/* ============================================================
   ICONES
============================================================ */

const iconList = [
  "Meth.png","cocaine.png","Munitions.png","organes.png",
  "Weed.png","Entrepot.png","Acier.png","Heroine.png",
  "LSD.png","bijoux.png","Metal.png","Titane.png","QG.png","criminel.png"
];

iconList.forEach(icon => {
  const option = document.createElement("option");
  option.value = icon;
  option.textContent = icon.replace(".png", "");
  pointIcon.appendChild(option);
});

/* ============================================================
   LOGIN
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
   FIREBASE
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
   FILTRES (CATÉGORIES)
============================================================ */

const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

let activeCategories = new Set();

toggleFilterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  filterPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {

  if (!filterPanel.contains(e.target) && e.target !== toggleFilterBtn) {
    filterPanel.classList.add("hidden");
  }

  if (!markerMenu.contains(e.target)) {
    markerMenu.classList.add("hidden");
  }

  if (suggestionBox && !suggestionBox.contains(e.target) && e.target !== searchInput) {
    suggestionBox.classList.add("hidden");
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
   DRAG + LIMITES
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
  const zoomStep = 0.1;

  // nouveau zoom
  scale += (e.deltaY < 0 ? zoomStep : -zoomStep);
  scale = Math.max(0.5, Math.min(4, scale));

  // centre visible de l'écran
  const centerX = mapContainer.clientWidth / 2;
  const centerY = mapContainer.clientHeight / 2;

  // point actuellement au centre, en coordonnées carte
  const worldX = (centerX - posX) / oldScale;
  const worldY = (centerY - posY) / oldScale;

  // recalcule posX / posY pour garder ce même point au centre
  posX = centerX - worldX * scale;
  posY = centerY - worldY * scale;

  updateMap();
});

/* ============================================================
   UPDATE MAP (MUR INVISIBLE FIX)
============================================================ */

function updateMap() {

  const containerW = mapContainer.clientWidth;
  const containerH = mapContainer.clientHeight;

  const mapW = mapInner.offsetWidth * scale;
  const mapH = mapInner.offsetHeight * scale;

  const minX = Math.min(0, containerW - mapW);
  const minY = Math.min(0, containerH - mapH);

  posX = Math.max(minX, Math.min(0, posX));
  posY = Math.max(minY, Math.min(0, posY));

  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;

  updateMarkerDisplay();
}

/* ============================================================
   MARKERS
============================================================ */

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

function addMarker(x, y, icon, name, id, category) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.id = id;
  img.dataset.name = name;
  img.dataset.icon = icon;
  img.dataset.category = category || "Non défini";

  /* TOOLTIP */
  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `<b>${name}</b><br>${img.dataset.category}`;
    tooltip.classList.add("show");

    const px = x * scale + posX;
    const py = y * scale + posY;

    tooltip.style.left = px + "px";
    tooltip.style.top = (py - 15) + "px";
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");
  });

  /* CLIC DROIT */
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    selectedMarker = img;

    markerMenu.classList.remove("hidden");
    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
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

newPointBtn.addEventListener("click", () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
});

mapContainer.addEventListener("click", (e) => {

  if (isDragging) return;

  if (moveMode && selectedMarker) {

    const rect = mapContainer.getBoundingClientRect();

    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    db.collection("markers").doc(selectedMarker.dataset.id).update({ x, y });

    moveMode = false;
    selectedMarker = null;
    return;
  }

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();

  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   VALIDER / MODIFIER
============================================================ */

validateBtn.addEventListener("click", async () => {

  if (!pointName.value || !pointIcon.value) return;

  if (editMode && selectedMarker) {

    selectedMarker.dataset.name = pointName.value;
    selectedMarker.dataset.icon = pointIcon.value;
    selectedMarker.dataset.category = pointCategory.value;

    selectedMarker.src = "icons/" + pointIcon.value;

    await db.collection("markers").doc(selectedMarker.dataset.id).update({
      name: pointName.value,
      icon: pointIcon.value,
      category: pointCategory.value
    });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  const doc = await db.collection("markers").add({
    x: tempX,
    y: tempY,
    name: pointName.value,
    icon: pointIcon.value,
    category: pointCategory.value
  });

  addMarker(tempX, tempY, pointIcon.value, pointName.value, doc.id, pointCategory.value);

  pointMenu.classList.add("hidden");
});

/* ============================================================
   ANNULER
============================================================ */

cancelBtn.addEventListener("click", () => {

  pointMenu.classList.add("hidden");

  editMode = false;
  moveMode = false;
  selectedMarker = null;

  pointName.value = "";
  pointCategory.value = "";
});

/* ============================================================
   MENU ACTIONS
============================================================ */

editBtn.addEventListener("click", () => {

  if (!selectedMarker) return;

  editMode = true;

  pointName.value = selectedMarker.dataset.name;
  pointIcon.value = selectedMarker.dataset.icon;
  pointCategory.value = selectedMarker.dataset.category;

  pointMenu.classList.remove("hidden");
  markerMenu.classList.add("hidden");
});

moveBtn.addEventListener("click", () => {
  moveMode = true;
  markerMenu.classList.add("hidden");
});

deleteBtn.addEventListener("click", async () => {

  if (!selectedMarker) return;

  await db.collection("markers").doc(selectedMarker.dataset.id).delete();

  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);

  selectedMarker = null;
  markerMenu.classList.add("hidden");
});

/* ============================================================
   RECHERCHE AVANCÉE
============================================================ */

if (searchInput && suggestionBox) {
  searchInput.addEventListener("input", () => {

    const value = searchInput.value.toLowerCase().trim();
    suggestionBox.innerHTML = "";

    if (!value) {
      suggestionBox.classList.add("hidden");
      return;
    }

    const results = markers.filter(m =>
      (m.dataset.name || "").toLowerCase().includes(value)
    );

    results.slice(0, 5).forEach(marker => {
      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = marker.dataset.name;

      div.addEventListener("click", () => {
        focusMarker(marker);
        suggestionBox.classList.add("hidden");
      });

      suggestionBox.appendChild(div);
    });

    if (results.length > 0) {
      suggestionBox.classList.remove("hidden");
    } else {
      suggestionBox.classList.add("hidden");
    }
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    const value = searchInput.value.toLowerCase().trim();

    const found = markers.find(m =>
      (m.dataset.name || "").toLowerCase().includes(value)
    );

    if (found) {
      focusMarker(found);
      suggestionBox.classList.add("hidden");
    }
  });
}

function focusMarker(marker) {
  const x = parseFloat(marker.dataset.x);
  const y = parseFloat(marker.dataset.y);

  const containerW = mapContainer.clientWidth;
  const containerH = mapContainer.clientHeight;

  posX = (containerW / 2) - (x * scale);
  posY = (containerH / 2) - (y * scale);

  updateMap();
}

/* ============================================================
   FIRESTORE
============================================================ */

db.collection("markers").onSnapshot(snapshot => {

  markers.forEach(m => m.remove());
  markers = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
  });

});

});
