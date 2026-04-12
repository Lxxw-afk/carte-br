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
let dragStartX = 0, dragStartY = 0;

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
  dragStartX = e.clientX - posX;
  dragStartY = e.clientY - posY;
  mapContainer.style.cursor = "grabbing";
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

  // limites
  const minX = Math.min(0, containerWidth - mapWidth);
  const minY = Math.min(0, containerHeight - mapHeight);

  const maxX = 0;
  const maxY = 0;

  // clamp
  posX = Math.max(minX, Math.min(maxX, posX));
  posY = Math.max(minY, Math.min(maxY, posY));

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
   FIREBASE
============================================================ */
async function createMarkerInFirebase(x, y, icon, name, category) {
  const doc = await db.collection("markers").add({
    x, y, icon, name, category
  });
  return doc.id;
}

async function updateMarkerInFirebase(marker, data) {
  const id = marker.dataset.id;
  if (id) await db.collection("markers").doc(id).update(data);
}

async function deleteMarkerInFirebase(marker) {
  const id = marker.dataset.id;
  if (id) await db.collection("markers").doc(id).delete();
}

/* ============================================================
   AJOUT MARKER
============================================================ */
function addMarker(x, y, icon, name, id, category) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  // DATA
  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.id = id;
  img.dataset.name = name;
  img.dataset.category = category || "Non défini";
  img.dataset.icon = icon;

  img.title = name; // sécurité navigateur

  /* =========================
     TOOLTIP
  ========================= */
  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `
      <div style="font-weight:bold;">${img.dataset.name}</div>
      <div style="font-size:12px;opacity:0.8;">${img.dataset.category}</div>
    `;
    tooltip.classList.remove("hidden");
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });

  img.addEventListener("mousemove", (e) => {
    tooltip.style.left = (e.pageX + 10) + "px";
    tooltip.style.top = (e.pageY - 20) + "px";
  });

  /* =========================
     CLIC DROIT (FIX)
  ========================= */
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation(); // 🔥 TRÈS IMPORTANT

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);

  updateMarkerDisplay();
  buildFilterMenu();

}

/* ============================================================
   NOUVEAU POINT
============================================================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
});

mapContainer.addEventListener("click", async (e) => {

  if (isDragging) return;

  if (moveMode && selectedMarker) {
    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    await updateMarkerInFirebase(selectedMarker, { x, y });

    moveMode = false;
    selectedMarker = null;
    updateMarkerDisplay();
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
   VALIDATION
============================================================ */
document.getElementById("validate-point").addEventListener("click", async () => {

  if (!pointName.value || !pointIcon.value) return;

  if (editMode && selectedMarker) {

    selectedMarker.dataset.name = pointName.value;
    selectedMarker.dataset.category = pointCategory.value;
    selectedMarker.src = "icons/" + pointIcon.value;

    await updateMarkerInFirebase(selectedMarker, {
      name: pointName.value,
      icon: pointIcon.value,
      category: pointCategory.value
    });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  const id = await createMarkerInFirebase(
    tempX,
    tempY,
    pointIcon.value,
    pointName.value,
    pointCategory.value
  );

  addMarker(
    tempX,
    tempY,
    pointIcon.value,
    pointName.value,
    id,
    pointCategory.value
  );

  pointMenu.classList.add("hidden");
});

/* ============================================================
   ANNULER (FIX COMPLET)
============================================================ */
document.getElementById("cancel-point").addEventListener("click", () => {

  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
  selectedMarker = null;

  pointName.value = "";
  pointIcon.value = "";
  if (pointCategory) pointCategory.value = "";
});

/* ============================================================
   MENU ACTIONS
============================================================ */
deleteBtn.addEventListener("click", async () => {
  if (!selectedMarker) return;

  await deleteMarkerInFirebase(selectedMarker);

  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);

  selectedMarker = null;
  markerMenu.style.display = "none";
});

editBtn.addEventListener("click", () => {
  if (!selectedMarker) return;

  editMode = true;

  pointName.value = selectedMarker.dataset.name;
  pointIcon.value = selectedMarker.dataset.icon;
  if (pointCategory) pointCategory.value = selectedMarker.dataset.category;

  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
});

moveBtn.addEventListener("click", () => {
  if (!selectedMarker) return;
  moveMode = true;
  markerMenu.style.display = "none";
});

/* ============================================================
   FERMETURE MENU CLIC DROIT
============================================================ */
document.addEventListener("click", (e) => {
  if (
    !markerMenu.contains(e.target) &&
    !e.target.classList.contains("marker")
  ) {
    markerMenu.style.display = "none";
  }
});

/* ============================================================
   TEMPS REEL FIRESTORE
============================================================ */
db.collection("markers").onSnapshot(snapshot => {

  snapshot.docChanges().forEach(change => {

    const doc = change.doc;
    const d = doc.data();

    /* =========================
       AJOUT
    ========================= */
    if (change.type === "added") {
      addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
      buildFilterMenu(); // 🔥 MAJ MENU
    }

    /* =========================
       MODIFICATION
    ========================= */
    if (change.type === "modified") {
      const marker = markers.find(m => m.dataset.id === doc.id);

      if (marker) {
        marker.dataset.x = d.x;
        marker.dataset.y = d.y;
        marker.dataset.name = d.name;
        marker.dataset.category = d.category;
        marker.src = "icons/" + d.icon;

        updateMarkerDisplay();
        buildFilterMenu(); // 🔥 MAJ MENU
      }
    }

    /* =========================
       SUPPRESSION
    ========================= */
    if (change.type === "removed") {
      const marker = markers.find(m => m.dataset.id === doc.id);

      if (marker) {
        marker.remove();
        markers = markers.filter(m => m !== marker);
      }

      buildFilterMenu(); // 🔥 MAJ MENU
    }

  });

});
/* ============================================================
   FILTRE PAR CATEGORIE
============================================================ */

const filterPanel = document.getElementById("filter-panel");
const toggleFilter = document.getElementById("toggle-filter");

// toutes les catégories
const categories = [
  "Drogue",
  "Entrepôt",
  "QG",
  "Munition",
  "Trafic d'organe",
  "PNJ"
];

// état des filtres
let activeFilters = {};

// init
categories.forEach(cat => activeFilters[cat] = true);

/* TOGGLE MENU */
toggleFilter.addEventListener("click", (e) => {
  e.stopPropagation(); // 🔥 empêche fermeture instant
  filterPanel.classList.toggle("hidden");
});

/* fermer si clic ailleurs */
document.addEventListener("click", (e) => {
  if (!filterPanel.contains(e.target) && e.target !== toggleFilter) {
    filterPanel.classList.add("hidden");
  }
});

/* CONSTRUIRE MENU */
function buildFilterMenu() {

  filterPanel.innerHTML = "";

  categories.forEach(cat => {

    const count = markers.filter(m =>
      m.dataset.category === cat
    ).length;

    const label = document.createElement("label");

    label.innerHTML = `
      <span>${cat} (${count})</span>
      <input type="checkbox" ${activeFilters[cat] ? "checked" : ""}>
    `;

    const checkbox = label.querySelector("input");

    checkbox.addEventListener("change", () => {
      activeFilters[cat] = checkbox.checked;
      applyFilters();
    });

    filterPanel.appendChild(label);
  });
}

/* APPLIQUER FILTRE */
function applyFilters() {

  markers.forEach(marker => {

    const cat = marker.dataset.category;

    if (activeFilters[cat]) {
      marker.style.display = "block";
    } else {
      marker.style.display = "none";
    }

  });
}
