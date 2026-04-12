document.addEventListener("DOMContentLoaded", () => {

/* ============================================================
   VARIABLES DOM
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
   DRAG + LIMITES (MUR INVISIBLE FIX)
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
   UPDATE MAP (LIMITES FIX)
============================================================ */

function updateMap() {

  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;

  const mapWidth = mapInner.offsetWidth * scale;
  const mapHeight = mapInner.offsetHeight * scale;

  const minX = Math.min(0, containerWidth - mapWidth);
  const minY = Math.min(0, containerHeight - mapHeight);

  posX = Math.max(minX, Math.min(0, posX));
  posY = Math.max(minY, Math.min(0, posY));

  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;

  updateMarkerDisplay();
}

/* ============================================================
   MARKERS DISPLAY
============================================================ */

function updateMarkerDisplay() {
  markers.forEach(marker => {
    const x = parseFloat(marker.dataset.x);
    const y = parseFloat(marker.dataset.y);

    marker.style.left = (x * scale) + "px";
    marker.style.top = (y * scale) + "px";
  });
}

/* ============================================================
   ADD MARKER
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

  /* TOOLTIP */
  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `<b>${name}</b><br>${category}`;
    tooltip.classList.add("show");

    const xPos = (x * scale) + posX;
    const yPos = (y * scale) + posY;

    tooltip.style.left = xPos + "px";
    tooltip.style.top = (yPos - 20) + "px";
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
}

/* ============================================================
   ACTIONS MENU (🔥 FIX)
============================================================ */

/* MODIFIER */
editBtn.addEventListener("click", () => {

  if (!selectedMarker) return;

  editMode = true;

  pointName.value = selectedMarker.dataset.name;
  pointIcon.value = selectedMarker.dataset.icon;
  pointCategory.value = selectedMarker.dataset.category;

  pointMenu.classList.remove("hidden");
  markerMenu.classList.add("hidden");
});

/* SUPPRIMER */
deleteBtn.addEventListener("click", async () => {

  if (!selectedMarker) return;

  await db.collection("markers").doc(selectedMarker.dataset.id).delete();

  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);

  markerMenu.classList.add("hidden");
});

/* DEPLACER */
moveBtn.addEventListener("click", () => {

  if (!selectedMarker) return;

  moveMode = true;
  markerMenu.classList.add("hidden");
});

/* ============================================================
   CLICK MAP
============================================================ */

mapContainer.addEventListener("click", async (e) => {

  const rect = mapContainer.getBoundingClientRect();

  const x = (e.clientX - rect.left - posX) / scale;
  const y = (e.clientY - rect.top - posY) / scale;

  /* MOVE */
  if (moveMode && selectedMarker) {

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    await db.collection("markers").doc(selectedMarker.dataset.id).update({ x, y });

    moveMode = false;
    selectedMarker = null;

    updateMarkerDisplay();
    return;
  }

  /* NEW POINT */
  if (!waitingForPlacement) return;

  tempX = x;
  tempY = y;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   VALIDER (🔥 FIX COMPLET)
============================================================ */

validateBtn.addEventListener("click", async () => {

  if (!pointName.value) return;

  /* EDIT */
  if (editMode && selectedMarker) {

    selectedMarker.dataset.name = pointName.value;
    selectedMarker.dataset.category = pointCategory.value;
    selectedMarker.dataset.icon = pointIcon.value;
    selectedMarker.src = "icons/" + pointIcon.value;

    await db.collection("markers").doc(selectedMarker.dataset.id).update({
      name: pointName.value,
      category: pointCategory.value,
      icon: pointIcon.value
    });

    editMode = false;
    selectedMarker = null;

    pointMenu.classList.add("hidden");
    return;
  }

  /* CREATE */
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
   ANNULER (🔥 FIX)
============================================================ */

cancelBtn.addEventListener("click", () => {

  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
  selectedMarker = null;
});

/* ============================================================
   FIRESTORE LIVE
============================================================ */

db.collection("markers").onSnapshot(snapshot => {

  markers.forEach(m => m.remove());
  markers = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
  });

});

/* ============================================================
   NEW POINT BUTTON
============================================================ */

document.getElementById("new-point-btn").addEventListener("click", () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
});

/* ============================================================
   CLOSE MENU
============================================================ */

document.addEventListener("click", (e) => {
  if (!markerMenu.contains(e.target)) {
    markerMenu.classList.add("hidden");
  }
});

});
