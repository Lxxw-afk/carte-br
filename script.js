/* ============================================================
   🔥 FIREBASE INIT
============================================================ */
let db = null;
let firebaseReady = false;

const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
  storageBucket: "carte-br.firebasestorage.app",
  messagingSenderId: "698417792662",
  appId: "1:698417792662:web:4766a306741bc5c71724b7"
};

try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  firebaseReady = true;
  console.log("Firebase OK");
} catch (err) {
  console.warn("Firebase désactivé :", err);
}

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
const iconPreview = document.getElementById("icon-preview");

const markerMenu = document.getElementById("marker-menu");
const editBtn = document.getElementById("edit-marker");
const moveBtn = document.getElementById("move-marker");
const deleteBtn = document.getElementById("delete-marker");

const tooltip = document.getElementById("tooltip");

/* ============================================================
   ICONES DISPONIBLES
============================================================ */
const iconList = [
  "Meth.png",
  "cocaine.png",
  "Munitions.png",
  "organes.png",
  "Weed.png",
  "Entrepot.png" // ajout Entrepôt
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
   DRAG STYLE GOOGLE MAPS
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
  const zoom = 0.1;
  scale += (e.deltaY < 0 ? zoom : -zoom);
  scale = Math.max(0.5, Math.min(4, scale));

  const mx = e.clientX - posX;
  const my = e.clientY - posY;

  posX -= (mx / oldScale) * (scale - oldScale);
  posY -= (my / oldScale) * (scale - oldScale);

  updateMap();
});

/* ============================================================
   MISE À JOUR AFFICHAGE CARTE + MARKERS
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

    let size = 45 / scale;
    size = Math.max(25, Math.min(60, size));
    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   FIREBASE HELPERS
============================================================ */
async function createMarkerInFirebase(x, y, icon, name) {
  if (!firebaseReady) return null;
  const doc = await db.collection("markers").add({ x, y, icon, name });
  return doc.id;
}

async function updateMarkerInFirebase(marker, data) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (id) await db.collection("markers").doc(id).update(data);
}

async function deleteMarkerInFirebase(marker) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (id) await db.collection("markers").doc(id).delete();
}

/* ============================================================
   AJOUT D’UN MARQUEUR
============================================================ */
function addMarker(x, y, icon, name, id = null) {
  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";
  img.title = name;

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.icon = icon;
  if (id) img.dataset.id = id;

  /* TOOLTIP SOUS LE MARQUEUR */
 // === TOOLTIP SOUS LE POINT (nom du point) ===
img.addEventListener("mouseenter", () => {
    const rect = img.getBoundingClientRect();
    const h = rect.height;

    tooltip.textContent = img.title;
    tooltip.classList.remove("hidden");

    tooltip.style.left = (rect.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top + h + 6) + "px";
});

img.addEventListener("mousemove", () => {
    const rect = img.getBoundingClientRect();
    const h = rect.height;

    tooltip.style.left = (rect.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top + h + 6) + "px";
});

img.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
});

  /* MENU CLIC DROIT */
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    selectedMarker = img;
    moveMode = false;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);

  updateMarkerDisplay();
}

/* ============================================================
   BOUTON NOUVEAU POINT
============================================================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
});

/* ============================================================
   CLICK SUR LA CARTE
============================================================ */
mapContainer.addEventListener("click", (e) => {
  if (isDragging) return;

  // Déplacement d'un marqueur
  if (moveMode && selectedMarker) {
    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    updateMarkerDisplay();
    updateMarkerInFirebase(selectedMarker, { x, y });

    moveMode = false;
    selectedMarker = null;
    return;
  }

  // Placement nouveau point
  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();
  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   PREVIEW ICÔNE
============================================================ */
pointIcon.addEventListener("change", () => {
  if (!pointIcon.value) {
    iconPreview.classList.add("hidden");
    return;
  }
  iconPreview.src = "icons/" + pointIcon.value;
  iconPreview.classList.remove("hidden");
});

/* ============================================================
   VALIDATION DU POINT
============================================================ */
document.getElementById("validate-point").addEventListener("click", async () => {
  if (!pointName.value || !pointIcon.value) {
    alert("Nom + Icône obligatoires !");
    return;
  }

  // MODE EDIT
  if (editMode && selectedMarker) {
    selectedMarker.title = pointName.value;
    selectedMarker.dataset.icon = pointIcon.value;
    selectedMarker.src = "icons/" + pointIcon.value;

    await updateMarkerInFirebase(selectedMarker, {
      name: pointName.value,
      icon: pointIcon.value
    });

    pointMenu.classList.add("hidden");
    editMode = false;
    selectedMarker = null;
    return;
  }

  // CREATION
  const id = await createMarkerInFirebase(tempX, tempY, pointIcon.value, pointName.value);
  addMarker(tempX, tempY, pointIcon.value, pointName.value, id);

  pointMenu.classList.add("hidden");
});

/* ============================================================
   ANNULER
============================================================ */
document.getElementById("cancel-point").addEventListener("click", () => {
  pointMenu.classList.add("hidden");
  selectedMarker = null;
  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
});

/* ============================================================
   MENU CLIC DROIT ACTIONS
============================================================ */
deleteBtn.addEventListener("click", async () => {
  if (!selectedMarker) return;
  await deleteMarkerInFirebase(selectedMarker);
  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);
  markerMenu.style.display = "none";
  selectedMarker = null;
});

editBtn.addEventListener("click", () => {
  if (!selectedMarker) return;
  editMode = true;
  pointName.value = selectedMarker.title;
  pointIcon.value = selectedMarker.dataset.icon;
  iconPreview.src = selectedMarker.src;
  iconPreview.classList.remove("hidden");
  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
});

moveBtn.addEventListener("click", () => {
  if (!selectedMarker) return;
  moveMode = true;
  markerMenu.style.display = "none";
});

/* ============================================================
   FERMER MENU CLIC DROIT SI ON CLIQUE AILLEURS
============================================================ */
window.addEventListener("click", () => {
  if (!moveMode) markerMenu.style.display = "none";
});

/* ============================================================
   TEMPS RÉEL FIRESTORE
============================================================ */
function listenRealtime() {
  if (!firebaseReady) return;
  db.collection("markers").onSnapshot(snapshot => {
    markers.forEach(m => m.remove());
    markers = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      addMarker(d.x, d.y, d.icon, d.name, doc.id);
    });
  });
}

listenRealtime();





