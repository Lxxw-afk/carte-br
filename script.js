/* ============================================================
   🔥 FIREBASE INIT (optionnel)
============================================================ */
let db = null;
let firebaseReady = false;

// ⚠️ Remplace par TON vrai config Firebase :
const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "XXX",
  projectId: "XXX",
  storageBucket: "XXX",
  messagingSenderId: "XXX",
  appId: "XXX"
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
   LISTE DES ICONES
============================================================ */
const iconList = [
  "Meth.png",
  "cocaine.png",
  "Munitions.png",
  "organes.png",
  "Weed.png"
];

iconList.forEach(icon => {
  const option = document.createElement("option");
  option.value = icon;
  option.textContent = icon.replace(".png", "");
  pointIcon.appendChild(option);
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

window.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - dragStartX;
  posY = e.clientY - dragStartY;

  updateMap();
});

/* ============================================================
   ZOOM (centré sur la souris)
============================================================ */
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();

  const oldScale = scale;
  const zoomSpeed = 0.1;

  scale += (e.deltaY < 0 ? zoomSpeed : -zoomSpeed);
  scale = Math.max(0.5, Math.min(4, scale));

  const mx = e.clientX - posX;
  const my = e.clientY - posY;

  posX -= (mx / oldScale) * (scale - oldScale);
  posY -= (my / oldScale) * (scale - oldScale);

  updateMap();
});

/* ============================================================
   MISE À JOUR CARTE + MARQUEURS
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

    // taille adaptée au zoom
    let size = 45 / scale;
    size = Math.max(25, size);
    size = Math.min(60, size);

    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   FIREBASE HELPERS (protégés par try/catch)
============================================================ */
async function createMarkerInFirebase(x, y, icon, name) {
  if (!firebaseReady) return null;
  try {
    const docRef = await db.collection("markers").add({ x, y, icon, name });
    return docRef.id;
  } catch (err) {
    console.warn("Erreur Firestore (create) -> marqueur LOCAL uniquement :", err);
    return null;
  }
}

async function updateMarkerInFirebase(marker, data) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (!id) return;
  try {
    await db.collection("markers").doc(id).update(data);
  } catch (err) {
    console.warn("Erreur Firestore (update) ignorée :", err);
  }
}

async function deleteMarkerInFirebase(marker) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (!id) return;
  try {
    await db.collection("markers").doc(id).delete();
  } catch (err) {
    console.warn("Erreur Firestore (delete) ignorée :", err);
  }
}

async function loadMarkersFromFirebase() {
  if (!firebaseReady) return;
  try {
    const snapshot = await db.collection("markers").get();
    snapshot.forEach(doc => {
      const d = doc.data();
      addMarker(d.x, d.y, d.icon, d.name, doc.id);
    });
  } catch (err) {
    console.warn("Erreur Firestore (load) -> on continue sans :", err);
  }
}

/* ============================================================
   AJOUT DOM DU MARQUEUR
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

  // tooltip (si présent dans le HTML)
  if (tooltip) {
    img.addEventListener("mouseenter", () => {
      tooltip.textContent = img.title;
      tooltip.classList.remove("hidden");
    });

    img.addEventListener("mouseleave", () => {
      tooltip.classList.add("hidden");
    });

    img.addEventListener("mousemove", (e) => {
      tooltip.style.left = e.pageX + "px";
      tooltip.style.top = (e.pageY - 25) + "px";
    });
  }

  // menu clic droit sur marqueur
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
   BOUTON : NOUVEAU POINT
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

  // déplacement d'un marqueur existant
  if (moveMode && selectedMarker) {
    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    moveMode = false;
    updateMarkerDisplay();
    updateMarkerInFirebase(selectedMarker, { x, y });
    selectedMarker = null;
    return;
  }

  // mode ajout
  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();
  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   PREVIEW ICONE
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
   VALIDATION POINT (CREATION + MODIF)
============================================================ */
const validateBtn =
  document.getElementById("validate-point") ||
  document.getElementById("save-point"); // sécurité si ancien id

validateBtn.addEventListener("click", async () => {
  if (!pointName.value || !pointIcon.value) {
    alert("Nom + Icône obligatoires !");
    return;
  }

  /* --- MODE MODIFICATION --- */
  if (editMode && selectedMarker) {
    selectedMarker.title = pointName.value;
    selectedMarker.src = "icons/" + pointIcon.value;
    selectedMarker.dataset.icon = pointIcon.value;

    await updateMarkerInFirebase(selectedMarker, {
      name: pointName.value,
      icon: pointIcon.value
    });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  /* --- MODE CREATION --- */
  let id = null;
  if (firebaseReady) {
    id = await createMarkerInFirebase(
      tempX,
      tempY,
      pointIcon.value,
      pointName.value
    );
  }

  // même si Firebase a échoué, on ajoute le point en local
  addMarker(tempX, tempY, pointIcon.value, pointName.value, id);

  pointMenu.classList.add("hidden");
});

/* ============================================================
   ANNULER
============================================================ */
document.getElementById("cancel-point").addEventListener("click", () => {
  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");
  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
  selectedMarker = null;
});

/* ============================================================
   MENU CLIC DROIT
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
  markerMenu.style.display = "none";

  pointName.value = selectedMarker.title;
  pointIcon.value = selectedMarker.dataset.icon;

  iconPreview.src = selectedMarker.src;
  iconPreview.classList.remove("hidden");

  pointMenu.classList.remove("hidden");
});

moveBtn.addEventListener("click", () => {
  if (!selectedMarker) return;
  moveMode = true;
  markerMenu.style.display = "none";
});

/* Fermer menu clic droit si on clique ailleurs */
window.addEventListener("click", () => {
  if (!moveMode) markerMenu.style.display = "none";
});

/* ============================================================
   CHARGEMENT INITIAL DES MARKERS
============================================================ */
loadMarkersFromFirebase();
