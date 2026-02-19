}/* ============================================================
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
   firebase.auth().signInAnonymously()
  .then(() => {
    console.log("Utilisateur authentifié anonymement");
  })
  .catch((error) => {
    console.error("Erreur auth anonyme :", error);
  });

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
  "Weed.png",
  "Heroine.png",
  "Entrepot.png",
  "Metal.png",
  "bijoux.png",
  "Titane.png",   // 👈 AJOUT
  "Acier.png", 
  "LSD.png",
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

 // Taille dynamique inversée : dézoom = grand, zoom = petit
let size = 60 / scale;

// Limite min/max
size = Math.max(20, size);  // taille mini quand très zoomé
size = Math.min(55, size);  // taille maxi quand dézoomé

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

function listenMarkersRealtime() {
  db.collection("markers").onSnapshot(snapshot => {
    markers.forEach(m => m.remove());  // clear DOM
    markers = [];

    snapshot.forEach(doc => {
      const d = doc.data();
      addMarker(d.x, d.y, d.icon, d.name, doc.id);
    });
  });
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

  /* TOOLTIP SOUS LE MARQUEUR */
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

    moveMode = false;
    updateMarkerDisplay();
    updateMarkerInFirebase(selectedMarker, { x, y });
    selectedMarker = null;
    return;
    loginError.textContent = "Code d'accès incorrect";
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
   VALIDATION POINT (ICI LE BOUTON EST BIEN validate-point)
============================================================ */
document.getElementById("validate-point").addEventListener("click", async () => {
  if (!pointName.value || !pointIcon.value) {
    alert("Nom + Icône obligatoires !");
    return;
  }

  // MODIFICATION
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
   🔥 LISTENER TEMPS RÉEL FIRESTORE
   (affiche les markers, les met à jour, et les supprime en live)
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

/* ===================== */
/* 🔐 SYSTÈME CONNEXION */
/* ===================== */
document.addEventListener("DOMContentLoaded", () => {
  const ACCESS_CODE = "BRIGADE2026"; // change-le quand tu veux

  const loginScreen = document.getElementById("login-screen");
  const app = document.getElementById("app");
  const loginBtn = document.getElementById("login-btn");
  const loginError = document.getElementById("login-error");
  const input = document.getElementById("access-code");

  if (!loginBtn) {
    console.error("❌ Bouton connexion introuvable");
    return;
  }

  loginBtn.addEventListener("click", () => {
    const value = input.value.trim();

    if (value === ACCESS_CODE) {
      loginScreen.style.display = "none";
      app.style.display = "block";
    } else {
      loginError.textContent = "Code d'accès incorrect";
    }
  });
});










