/* ============================================================
   🔥 FIREBASE INIT (avec fallback si ça plante)
============================================================ */
let db = null;
let firebaseReady = false;

// ⚠️ Remplace par ton vrai firebaseConfig de la console Firebase
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
   TEXTES MODIFIABLES POUR LE POPUP
============================================================ */
const TEXT_1 = "Entrée";
const TEXT_2 = "Sortie";

/* ============================
   DRAG & DROP POUR LES 2 IMAGES
============================ */
let uploadedImg1 = null;
let uploadedImg2 = null;

function setupDropZone(zoneId, previewId, callback) {
  const zone = document.getElementById(zoneId);
  const preview = document.getElementById(previewId);

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.style.borderColor = "white";
  });

  zone.addEventListener("dragleave", () => {
    zone.style.borderColor = "rgba(255,255,255,0.4)";
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.style.borderColor = "rgba(255,255,255,0.4)";

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove("hidden");
      callback(file);
    };
    reader.readAsDataURL(file);
  });

  zone.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        preview.src = reader.result;
        preview.classList.remove("hidden");
        callback(file);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

/* ============================================================
   FIREBASE STORAGE UPLOAD
============================================================ */
async function uploadImageToStorage(file, path) {
  if (!file) return null; // si aucune image envoyée, on retourne null
  const ref = firebase.storage().ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
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

// Drop zones
setupDropZone("drop-img1", "preview-img1", (file) => uploadedImg1 = file);
setupDropZone("drop-img2", "preview-img2", (file) => uploadedImg2 = file);


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
   DRAG GOOGLE MAPS
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
   ZOOM CENTRÉ SUR LA SOURIS
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
   MISE A JOUR CARTE + MARQUEURS
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
    size = Math.max(25, size);
    size = Math.min(60, size);

    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   FIREBASE HELPERS
============================================================ */
async function createMarkerInFirebase(x, y, icon, name) {
  if (!firebaseReady) return null;
  const docRef = await db.collection("markers").add({ x, y, icon, name });
  return docRef.id;
}

async function updateMarkerInFirebase(marker, data) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (!id) return;
  await db.collection("markers").doc(id).update(data);
}

async function deleteMarkerInFirebase(marker) {
  if (!firebaseReady) return;
  const id = marker.dataset.id;
  if (!id) return;
  await db.collection("markers").doc(id).delete();
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

  /* ============================================================
     TOOLTIP AUTO-ADAPTÉ SELON TAILLE ET ZOOM
  ============================================================ */
  img.addEventListener("mouseenter", () => {
    const rect = img.getBoundingClientRect();
    const markerHeight = rect.height;

    tooltip.textContent = img.title;
    tooltip.className = "marker-tooltip";
    tooltip.style.left = (rect.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top + markerHeight + 6) + "px";
    tooltip.classList.remove("hidden");
  });

  img.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });

  /* ============================================================
     CLIC GAUCHE = POPUP AVEC 2 IMAGES + 2 TEXTES
  ============================================================ */
  img.addEventListener("click", async (e) => {
    e.stopPropagation();

    const idFromMarker = img.dataset.id;
    if (!idFromMarker) return;

    const docSnap = await db.collection("markers").doc(idFromMarker).get();
    const data = docSnap.data();
    if (!data) return;

    const popup = document.getElementById("marker-popup");
    const rect = img.getBoundingClientRect();

    // Textes
    document.getElementById("popup-text1").textContent = TEXT_1;
    document.getElementById("popup-text2").textContent = TEXT_2;

    // Images
    document.getElementById("popup-img1").src = data.img1 || "";
    document.getElementById("popup-img2").src = data.img2 || "";

    popup.style.left = (rect.left + rect.width / 2) + "px";
    popup.style.top = (rect.top - 220) + "px";

    // Toggle : si déjà visible et même marker → fermer
    if (!popup.classList.contains("hidden") && popup.dataset.forId === idFromMarker) {
      popup.classList.add("hidden");
      popup.dataset.forId = "";
      return;
    }

    popup.dataset.forId = idFromMarker;
    popup.classList.remove("hidden");
  });

  /* ============================================================
     MENU CLIC DROIT (inchangé)
  ============================================================ */
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

    moveMode = false;
    updateMarkerDisplay();
    updateMarkerInFirebase(selectedMarker, { x, y });
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
   VALIDATION POINT
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

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    waitingForPlacement = false;
    return;
  }

  // -----------------------
  // CREATION D’UN NOUVEAU POINT
  // -----------------------
  const id = await createMarkerInFirebase(
    tempX,
    tempY,
    pointIcon.value,
    pointName.value
  );

  // Upload des deux images (si présentes)
  const img1URL = await uploadImageToStorage(uploadedImg1, "markers/" + id + "_1.png");
  const img2URL = await uploadImageToStorage(uploadedImg2, "markers/" + id + "_2.png");

  await db.collection("markers").doc(id).update({
    img1: img1URL,
    img2: img2URL
  });

  addMarker(tempX, tempY, pointIcon.value, pointName.value, id);

  // Fermeture du menu + reset
  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");
  waitingForPlacement = false;

  uploadedImg1 = null;
  uploadedImg2 = null;
  selectedMarker = null;
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

/* ============================================================
   FERMETURE POPUP & MENU AU CLIC GLOBAL
============================================================ */
window.addEventListener("click", (e) => {
  const popup = document.getElementById("marker-popup");

  // Si clic sur un marker ou une image du popup → ne pas fermer
  if (e.target.classList.contains("marker")) return;
  if (e.target.classList.contains("popup-img")) return;

  // Fermer popup
  popup.classList.add("hidden");
  popup.dataset.forId = "";

  // Fermer le menu clic droit si on clique ailleurs
  if (!moveMode) markerMenu.style.display = "none";
});

/* ============================================================
   🔥 LISTENER TEMPS RÉEL FIRESTORE
============================================================ */
function listenMarkersRealtime() {
  db.collection("markers").onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      const doc = change.doc;
      const d = doc.data();

      // AJOUT
      if (change.type === "added") {
        addMarker(d.x, d.y, d.icon, d.name, doc.id);
      }

      // MODIFICATION
      if (change.type === "modified") {
        const marker = markers.find(m => m.dataset.id === doc.id);
        if (marker) {
          marker.dataset.x = d.x;
          marker.dataset.y = d.y;
          marker.dataset.icon = d.icon;
          marker.title = d.name;
          marker.src = "icons/" + d.icon;
          updateMarkerDisplay();
        }
      }

      // SUPPRESSION
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

// ACTIVATION DU MODE TEMPS RÉEL
listenMarkersRealtime();















