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
  "Entrepot.png",
  "Acier.png",
  "Heroine.png",
  "LSD.png",
  "bijoux.png",
  "Metal.png",
  "Titane.png",
   "QG.png"
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
   DRAG GOOGLE MAP STYLE
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

  // Calcul des limites
  const minX = Math.min(0, containerWidth - mapWidth);
  const minY = Math.min(0, containerHeight - mapHeight);

  const maxX = 0;
  const maxY = 0;

  // Clamp (empêche de sortir de la carte)
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

    // 🔥 Nouvelle taille plus discrète
    let size = 28 / scale;

    // limites propres
    size = Math.max(18, Math.min(32, size));

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

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.icon = icon;
  img.dataset.id = id;
  img.dataset.name = name;

 // TOOLTIP AMÉLIORÉ
img.addEventListener("mouseenter", () => {
    tooltip.innerHTML = `
        <img src="icons/${img.dataset.icon}">
        <div>
            <div style="font-weight:bold;">${img.dataset.name}</div>
            <div style="font-size:11px;opacity:0.7;">Point RP</div>
        </div>
    `;
    tooltip.classList.add("show");
});

img.addEventListener("mouseleave", () => {
    tooltip.classList.remove("show");
});

img.addEventListener("mousemove", (e) => {
    tooltip.style.left = (e.pageX + 12) + "px";
    tooltip.style.top = (e.pageY - 20) + "px";
});

  /* ===== CLIC DROIT ===== */

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

    selectedMarker.dataset.name = pointName.value;
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
   ANNULER CONFIGURATION POINT
============================================================ */

document.getElementById("cancel-point").addEventListener("click", () => {

  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
  selectedMarker = null;

  // Nettoyage des champs
  pointName.value = "";
  pointIcon.value = "";
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
        marker.dataset.name = d.name;
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

}); // ✅ FERME onSnapshot

/* ============================================================
   🔍 RECHERCHE DE POINT
============================================================ */

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", () => {
  const value = searchInput.value.toLowerCase();

  markers.forEach(marker => {
    const name = marker.dataset.name.toLowerCase();

    marker.style.opacity = name.includes(value) ? "1" : "0.2";
  });
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;

  const value = searchInput.value.toLowerCase();

  const found = markers.find(m =>
    m.dataset.name.toLowerCase().includes(value)
  );

  if (!found) return;

  const x = parseFloat(found.dataset.x);
  const y = parseFloat(found.dataset.y);

  posX = window.innerWidth / 2 - x * scale;
  posY = window.innerHeight / 2 - y * scale;

  updateMap();
});
const suggestionsBox = document.getElementById("search-suggestions");

searchInput.addEventListener("input", () => {

    const value = searchInput.value.toLowerCase();
    suggestionsBox.innerHTML = "";

    if (!value) {
        suggestionsBox.classList.add("hidden");
        return;
    }

    const results = markers.filter(m =>
        m.dataset.name.toLowerCase().includes(value)
    );

    results.slice(0, 5).forEach(m => {

        const div = document.createElement("div");
        div.className = "suggestion";
        div.textContent = m.dataset.name;

        div.addEventListener("click", () => {
            centerOnMarker(m);
            suggestionsBox.classList.add("hidden");
        });

        suggestionsBox.appendChild(div);
    });

    suggestionsBox.classList.toggle("hidden", results.length === 0);
});

/* CENTRER CAMÉRA */
function centerOnMarker(marker) {
    const x = parseFloat(marker.dataset.x);
    const y = parseFloat(marker.dataset.y);

    posX = window.innerWidth / 2 - x * scale;
    posY = window.innerHeight / 2 - y * scale;

    updateMap();
}
document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-input")) {
        suggestionsBox.classList.add("hidden");
    }
});
