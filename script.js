/* ============================================================
   FIREBASE INIT
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

firebase.initializeApp(firebaseConfig);
db = firebase.firestore();
firebaseReady = true;

/* ============================================================
   DOM
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
["Meth.png","cocaine.png","Munitions.png","organes.png","Weed.png","Entrepot.png"]
.forEach(icon => {
  const o = document.createElement("option");
  o.value = icon;
  o.textContent = icon.replace(".png","");
  pointIcon.appendChild(o);
});

/* ============================================================
   STATE
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
let tempX = 0, tempY = 0;

/* ============================================================
   DRAG
============================================================ */
mapContainer.addEventListener("mousedown", e => {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX - posX;
  dragStartY = e.clientY - posY;
});

window.addEventListener("mousemove", e => {
  if (!isDragging) return;
  posX = e.clientX - dragStartX;
  posY = e.clientY - dragStartY;
  updateMap();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

/* ============================================================
   ZOOM
============================================================ */
mapContainer.addEventListener("wheel", e => {
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
   UPDATE
============================================================ */
function updateMap() {
  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;
  updateMarkers();
}

function updateMarkers() {
  markers.forEach(m => {
    const x = parseFloat(m.dataset.x);
    const y = parseFloat(m.dataset.y);

    m.style.left = x * scale + "px";
    m.style.top = y * scale + "px";

    let size = 45 / scale;
    size = Math.max(25, Math.min(60, size));
    m.style.width = size + "px";
    m.style.height = size + "px";
  });
}

/* ============================================================
   ADD MARKER DOM
============================================================ */
function addMarker(x,y,icon,name,id) {

  if (markers.find(m => m.dataset.id === id)) return;

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";
  img.title = name;

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.icon = icon;
  img.dataset.id = id;

  img.addEventListener("contextmenu", e => {
    e.preventDefault();
    selectedMarker = img;
    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  img.addEventListener("mouseenter", () => {
    const r = img.getBoundingClientRect();
    tooltip.textContent = name;
    tooltip.classList.remove("hidden");
    tooltip.style.left = r.left + r.width/2 + "px";
    tooltip.style.top = r.top + r.height + 6 + "px";
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });

  markerLayer.appendChild(img);
  markers.push(img);
  updateMarkers();
}

/* ============================================================
   REALTIME PROPER
============================================================ */
db.collection("markers").onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {

    const d = change.doc.data();
    const id = change.doc.id;

    if (change.type === "added") {
      addMarker(d.x,d.y,d.icon,d.name,id);
    }

    if (change.type === "modified") {
      const m = markers.find(x => x.dataset.id === id);
      if (m) {
        m.dataset.x = d.x;
        m.dataset.y = d.y;
        m.dataset.icon = d.icon;
        m.title = d.name;
        m.src = "icons/" + d.icon;
        updateMarkers();
      }
    }

    if (change.type === "removed") {
      const m = markers.find(x => x.dataset.id === id);
      if (m) {
        m.remove();
        markers = markers.filter(x => x !== m);
      }
    }

  });
});

/* ============================================================
   NEW POINT
============================================================ */
document.getElementById("new-point-btn").onclick = () => {
  waitingForPlacement = true;
  step1.classList.remove("hidden");
};

/* ============================================================
   MAP CLICK
============================================================ */
mapContainer.addEventListener("click", e => {

  if (isDragging) return;

  const rect = mapContainer.getBoundingClientRect();
  const x = (e.clientX - rect.left - posX) / scale;
  const y = (e.clientY - rect.top - posY) / scale;

  if (moveMode && selectedMarker) {
    db.collection("markers").doc(selectedMarker.dataset.id)
      .update({ x,y });

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
   VALIDATE
============================================================ */
document.getElementById("validate-point").onclick = async () => {

  if (!pointName.value || !pointIcon.value) return;

  if (editMode && selectedMarker) {
    await db.collection("markers")
      .doc(selectedMarker.dataset.id)
      .update({
        name: pointName.value,
        icon: pointIcon.value
      });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  await db.collection("markers").add({
    x: tempX,
    y: tempY,
    icon: pointIcon.value,
    name: pointName.value
  });

  pointMenu.classList.add("hidden");
};

/* ============================================================
   MENU ACTIONS
============================================================ */
deleteBtn.onclick = () => {
  if (!selectedMarker) return;
  db.collection("markers").doc(selectedMarker.dataset.id).delete();
  markerMenu.style.display = "none";
};

editBtn.onclick = () => {
  if (!selectedMarker) return;
  editMode = true;
  pointName.value = selectedMarker.title;
  pointIcon.value = selectedMarker.dataset.icon;
  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
};

moveBtn.onclick = () => {
  if (!selectedMarker) return;
  moveMode = true;
  markerMenu.style.display = "none";
};

window.addEventListener("click", () => {
  markerMenu.style.display = "none";
});


