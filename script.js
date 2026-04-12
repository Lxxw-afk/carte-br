document.addEventListener("DOMContentLoaded", () => {

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const step1 = document.getElementById("step1");
const pointMenu = document.getElementById("point-menu");

const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const pointCategory = document.getElementById("point-category");

const tooltip = document.getElementById("tooltip");

const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

/* LOGIN */
document.getElementById("login-btn").addEventListener("click", () => {
  const value = document.getElementById("access-code").value.trim();

  if (value === "BRIGADE2026") {
    loginScreen.remove();
    app.classList.remove("hidden");
  }
});

/* FIREBASE */
const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* VARS */
let posX = 0, posY = 0;
let scale = 1;

let isDragging = false;
let dragStartX = 0, dragStartY = 0;

let waitingForPlacement = false;

let tempX = 0, tempY = 0;

let markers = [];

/* DRAG */
mapContainer.addEventListener("mousedown", (e) => {
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

window.addEventListener("mouseup", () => isDragging = false);

/* ZOOM */
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

/* MAP */
function updateMap() {
  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;
  updateMarkers();
}

/* FIX IMPORTANT MARKERS */
function updateMarkers() {
  markers.forEach(m => {
    const x = parseFloat(m.dataset.x);
    const y = parseFloat(m.dataset.y);

    m.style.left = x + "px";
    m.style.top = y + "px";

    let size = 26 / scale;
    size = Math.max(18, Math.min(32, size));

    m.style.width = size + "px";
    m.style.height = size + "px";
  });
}

/* MARKER */
function addMarker(x, y, icon, name, id, category) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.name = name;
  img.dataset.category = category || "Non défini";

  img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `<b>${name}</b><br>${category}`;
    tooltip.style.display = "block";
  });

  img.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  img.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  });

  markerLayer.appendChild(img);
  markers.push(img);

  updateMarkers();
}

/* FIRESTORE */
db.collection("markers").onSnapshot(snapshot => {

  markers.forEach(m => m.remove());
  markers = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
  });

});

});
