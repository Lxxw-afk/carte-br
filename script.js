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

const markerMenu = document.getElementById("marker-menu");
const editBtn = document.getElementById("edit-marker");
const moveBtn = document.getElementById("move-marker");
const deleteBtn = document.getElementById("delete-marker");

const markerTooltip = document.getElementById("marker-tooltip");

/* ============================================================
   ICONES
============================================================ */

const iconList = [
  "Meth.png",
  "cocaine.png",
  "Munitions.png",
  "organes.png",
  "Weed.png",
  "Entrepot.png",
   "Acier.png",
   "Heroine.png",
   "LSD.png",
   "bijoux.png",
   "Metal.png",
   "Titane.png"
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
   DRAG (GOOGLE MAP STYLE)
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
  const doc = await db.collection("markers").add({ x, y, icon, name });
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

function addMarker(x, y, icon, name, id) {

  if (markers.some(m => m.dataset.id === id)) return;

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";
  img.title = name; // 🔥 IMPORTANT

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.icon = icon;
  img.dataset.id = id;

  /* ============================
     TOOLTIP EXACT COMME AVANT
  ============================ */

  img.addEventListener("mouseenter", () => {
    const rect = img.getBoundingClientRect();
    const markerHeight = rect.height;

    markerTooltip.textContent = img.title;
    markerTooltip.className = "marker-tooltip";

    markerTooltip.style.left = (rect.left + rect.width / 2) + "px";
    markerTooltip.style.top = (rect.top + markerHeight + 6) + "px";

    markerTooltip.classList.remove("hidden");
  });

  img.addEventListener("mousemove", () => {
    const rect = img.getBoundingClientRect();
    const markerHeight = rect.height;

    markerTooltip.style.left = (rect.left + rect.width / 2) + "px";
    markerTooltip.style.top = (rect.top + markerHeight + 6) + "px";
  });

  img.addEventListener("mouseleave", () => {
    markerTooltip.classList.add("hidden");
  });

  /* ============================
     CLIC DROIT
  ============================ */

  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);
  updateMarkerDisplay();
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
    selectedMarker.title = pointName.value;
    selectedMarker.src = "icons/" + pointIcon.value;

    await updateMarkerInFirebase(selectedMarker, {
      name: pointName.value,
      icon: pointIcon.value
    });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  const id = await createMarkerInFirebase(tempX, tempY, pointIcon.value, pointName.value);
  addMarker(tempX, tempY, pointIcon.value, pointName.value, id);

  pointMenu.classList.add("hidden");
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
  pointName.value = selectedMarker.title;
  pointIcon.value = selectedMarker.dataset.icon;

  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
});

moveBtn.addEventListener("click", () => {
  if (!selectedMarker) return;
  moveMode = true;
  markerMenu.style.display = "none";
});

document.addEventListener("click", (e) => {
  if (!markerMenu.contains(e.target)) {
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

    if (change.type === "added") {
      addMarker(d.x, d.y, d.icon, d.name, doc.id);
    }

    if (change.type === "modified") {
      const marker = markers.find(m => m.dataset.id === doc.id);
      if (marker) {
        marker.dataset.x = d.x;
        marker.dataset.y = d.y;
        marker.title = d.name;
        marker.src = "icons/" + d.icon;
        updateMarkerDisplay();
      }
    }

    if (change.type === "removed") {
      const marker = markers.find(m => m.dataset.id === doc.id);
      if (marker) {
        marker.remove();
        markers = markers.filter(m => m !== marker);
      }
    }

  });

});
