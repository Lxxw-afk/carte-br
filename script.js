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
   ICONES
============================================================ */
const iconList = [
  "Meth.png",
  "cocaine.png",
  "Munitions.png",
  "organes.png",
  "Weed.png",
  "Entrepot.png"
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
let dragStartX = 0;
let dragStartY = 0;

let waitingForPlacement = false;
let moveMode = false;
let editMode = false;

let selectedMarker = null;
let markers = [];

let tempX = 0;
let tempY = 0;

/* ============================================================
   DRAG GOOGLE MAPS
============================================================ */
mapContainer.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
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
   ADD MARKER
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

  /* TOOLTIP */
  img.addEventListener("mouseenter", () => {
    const rect = img.getBoundingClientRect();
    tooltip.textContent = img.title;
    tooltip.classList.remove("hidden");

    tooltip.style.left = (rect.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top + rect.height + 6) + "px";
  });

  img.addEventListener("mousemove", () => {
    const rect = img.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top + rect.height + 6) + "px";
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });

  /* MENU CLIC DROIT */
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
}

/* ============================================================
   NEW POINT
============================================================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
  waitingForPlacement = true;
  moveMode = false;
  editMode = false;
  selectedMarker = null;
  step1.classList.remove("hidden");
});

/* ============================================================
   MAP CLICK
============================================================ */
mapContainer.addEventListener("click", (e) => {
  if (isDragging) return;

  const rect = mapContainer.getBoundingClientRect();
  const x = (e.clientX - rect.left - posX) / scale;
  const y = (e.clientY - rect.top - posY) / scale;

  if (moveMode && selectedMarker) {
    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;
    updateMarkerDisplay();
    updateMarkerInFirebase(selectedMarker, { x, y });
    moveMode = false;
    selectedMarker = null;
    return;
  }

  if (!waitingForPlacement) return;

  tempX = x;
  tempY = y;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   VALIDATE POINT
============================================================ */
document.getElementById("validate-point").addEventListener("click", async () => {
  if (!pointName.value || !pointIcon.value) {
    alert("Nom + Icône obligatoires !");
    return;
  }

  if (editMode && selectedMarker) {
    selectedMarker.title = pointName.value;
    selectedMarker.dataset.icon = pointIcon.value;
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
   CLOSE MENU
============================================================ */
window.addEventListener("click", () => {
  if (!moveMode) markerMenu.style.display = "none";
});

/* ============================================================
   REALTIME FIRESTORE
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

function listenRealtime() {
  if (!firebaseReady) return;

  db.collection("markers").onSnapshot(snapshot => {

    snapshot.docChanges().forEach(change => {

      const doc = change.doc;
      const data = doc.data();

      // ➕ AJOUT
      if (change.type === "added") {
        addMarker(data.x, data.y, data.icon, data.name, doc.id);
      }

      // ✏ MODIFICATION
      if (change.type === "modified") {
        const marker = markers.find(m => m.dataset.id === doc.id);
        if (marker) {
          marker.dataset.x = data.x;
          marker.dataset.y = data.y;
          marker.dataset.icon = data.icon;
          marker.title = data.name;
          marker.src = "icons/" + data.icon;
          updateMarkerDisplay();
        }
      }

      // 🗑 SUPPRESSION
      if (change.type === "removed") {
        const marker = markers.find(m => m.dataset.id === doc.id);
        if (marker) {
          marker.remove();
          markers = markers.filter(m => m !== marker);
        }
      }

    });

  });
}



