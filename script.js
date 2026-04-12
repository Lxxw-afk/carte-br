document.addEventListener("DOMContentLoaded", () => {

/* ================= ELEMENTS ================= */

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

/* ================= LOGIN ================= */

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

/* ================= FIREBASE ================= */

const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ================= STATE ================= */

let posX = 0, posY = 0;
let scale = 1;
let isDragging = false;

let waitingForPlacement = false;
let moveMode = false;
let editMode = false;

let selectedMarker = null;
let markers = [];

let tempX = 0, tempY = 0;

/* ================= MAP DRAG ================= */

mapContainer.addEventListener("mousedown", (e) => {
  if (waitingForPlacement || moveMode) return;

  isDragging = true;
  mapContainer.dataset.startX = e.clientX - posX;
  mapContainer.dataset.startY = e.clientY - posY;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - mapContainer.dataset.startX;
  posY = e.clientY - mapContainer.dataset.startY;

  updateMap();
});

window.addEventListener("mouseup", () => isDragging = false);

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
}

/* ================= TOOLTIP ================= */

function showTooltip(marker, e) {
  tooltip.innerHTML = `
    <img src="icons/${marker.dataset.icon}">
    <div><b>${marker.dataset.name}</b><br>${marker.dataset.category}</div>
  `;
  tooltip.classList.add("show");
}

function moveTooltip(e) {
  tooltip.style.left = (e.pageX + 10) + "px";
  tooltip.style.top = (e.pageY + 10) + "px";
}

function hideTooltip() {
  tooltip.classList.remove("show");
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
  img.dataset.category = category || "Inconnu";
  img.dataset.icon = icon;

  img.addEventListener("mouseenter", (e) => showTooltip(img, e));
  img.addEventListener("mousemove", moveTooltip);
  img.addEventListener("mouseleave", hideTooltip);

  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);
}

/* ================= CLICK MAP ================= */

mapContainer.addEventListener("click", async (e) => {

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();

  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ================= SAVE ================= */

if (validateBtn) {
validateBtn.onclick = async () => {

  const doc = await db.collection("markers").add({
    x: tempX,
    y: tempY,
    icon: pointIcon.value,
    name: pointName.value,
    category: pointCategory.value
  });

  addMarker(tempX, tempY, pointIcon.value, pointName.value, doc.id, pointCategory.value);

  pointMenu.classList.add("hidden");
};
}

if (cancelBtn) {
cancelBtn.onclick = () => {
  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
};
}

/* ================= MENU ================= */

editBtn.onclick = () => {
  if (!selectedMarker) return;

  editMode = true;

  pointName.value = selectedMarker.dataset.name;
  pointIcon.value = selectedMarker.dataset.icon;
  pointCategory.value = selectedMarker.dataset.category;

  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
};

moveBtn.onclick = () => {
  moveMode = true;
  markerMenu.style.display = "none";
};

deleteBtn.onclick = async () => {
  if (!selectedMarker) return;

  await db.collection("markers").doc(selectedMarker.dataset.id).delete();

  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);

  markerMenu.style.display = "none";
};

/* ================= FIREBASE ================= */

db.collection("markers").onSnapshot(snapshot => {

  markers.forEach(m => m.remove());
  markers = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    addMarker(d.x, d.y, d.icon, d.name, doc.id, d.category);
  });

});

});
