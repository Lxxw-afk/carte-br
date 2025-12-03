/* -------------------------
   CONFIG FIREBASE
---------------------------*/
const firebaseConfig = {
    apiKey: "AIzaSyAOl4dbsUaqmp9S0OBvx3A7F6jw4E3K4TE",
    authDomain: "carte-br.firebaseapp.com",
    projectId: "carte-br",
    storageBucket: "carte-br.firebasestorage.app",
    messagingSenderId: "698417792662",
    appId: "1:698417792662:web:4766a306741b5c71724b7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* -------------------------
   VARIABLES
---------------------------*/
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");
const menu = document.getElementById("marker-menu");
const nameInput = document.getElementById("marker-name");
const iconList = document.getElementById("icon-list");
const confirmBtn = document.getElementById("confirm-marker");
const cancelBtn = document.getElementById("cancel-marker");

let scale = 1;
let isDragging = false;
let startX, startY;
let posX = 0, posY = 0;

let addingPoint = false;
let pendingX, pendingY;
let selectedIcon = null;

/* -------------------------
   MODE AJOUT DE POINT
---------------------------*/
document.getElementById("new-point-btn").addEventListener("click", () => {
    addingPoint = true;
    alert("Clique sur la carte pour placer le point");
});

/* -------------------------
   DEPLACEMENT CARTE
---------------------------*/
mapContainer.addEventListener("mousedown", (e) => {
    if (addingPoint) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
});

window.addEventListener("mouseup", () => isDragging = false);

window.addEventListener("mousemove", (e) => {
    if (!isDragging || addingPoint) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;

    updateTransform();
});

/* -------------------------
   ZOOM MOLETTE
---------------------------*/
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;

    scale += (e.deltaY < 0 ? zoomIntensity : -zoomIntensity);
    if (scale < 0.2) scale = 0.2;
    if (scale > 5) scale = 5;

    updateTransform();
});

function updateTransform() {
    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

/* -------------------------
   CLICK POUR AJOUTER LE POINT
---------------------------*/
mapContainer.addEventListener("click", (e) => {
    if (!addingPoint) return;

    const rect = mapContainer.getBoundingClientRect();
    pendingX = (e.clientX - rect.left - posX) / scale;
    pendingY = (e.clientY - rect.top - posY) / scale;

    openMarkerMenu();
});

/* -------------------------
   CHARGER LES ICONES
---------------------------*/
const icons = [
    "Meth.png",
    "cocaine.png",
    "munitions.png",
    "organes.png",
    "weed.png"
];

function loadIcons() {
    iconList.innerHTML = "";
    icons.forEach(file => {
        const img = document.createElement("img");
        img.src = "icons/" + file;
        img.classList.add("icon-option");

        img.addEventListener("click", () => {
            document.querySelectorAll(".icon-option").forEach(i => i.classList.remove("selected"));
            img.classList.add("selected");
            selectedIcon = file;
        });

        iconList.appendChild(img);
    });
}

loadIcons();

/* -------------------------
   MENU CREATION
---------------------------*/
function openMarkerMenu() {
    nameInput.value = "";
    selectedIcon = null;
    document.querySelectorAll(".icon-option").forEach(i => i.classList.remove("selected"));

    menu.classList.remove("hidden");
}

cancelBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    addingPoint = false;
});

confirmBtn.addEventListener("click", () => {
    if (!nameInput.value || !selectedIcon) {
        alert("Nom + icône obligatoires !");
        return;
    }

    saveMarkerToFirebase(pendingX, pendingY, nameInput.value, selectedIcon);

    menu.classList.add("hidden");
    addingPoint = false;
});

/* -------------------------
   SAUVEGARDE FIREBASE
---------------------------*/
function saveMarkerToFirebase(x, y, name, icon) {
    db.collection("markers").add({ x, y, name, icon });
}

/* -------------------------
   AFFICHER LES MARQUEURS
---------------------------*/
function displayMarker(id, data) {
    const marker = document.createElement("img");
    marker.classList.add("marker");
    marker.src = "icons/" + data.icon;
    marker.style.left = data.x + "px";
    marker.style.top = data.y + "px";
    marker.title = data.name;

    // clic droit : menu
    marker.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const choice = prompt("1 = Renommer\n2 = Supprimer\n3 = Déplacer");

        if (choice == "1") {
            const newName = prompt("Nouveau nom :", data.name);
            if (newName) db.collection("markers").doc(id).update({ name: newName });
        }

        if (choice == "2") {
            db.collection("markers").doc(id).delete();
        }

        if (choice == "3") {
            alert("Clique une nouvelle position");
            addingPoint = true;

            mapContainer.addEventListener("click", function move(ev) {
                const rect = mapContainer.getBoundingClientRect();
                const newX = (ev.clientX - rect.left - posX) / scale;
                const newY = (ev.clientY - rect.top - posY) / scale;

                db.collection("markers").doc(id).update({ x: newX, y: newY });

                addingPoint = false;
                mapContainer.removeEventListener("click", move);
            });
        }
    });

    markerLayer.appendChild(marker);
}

/* -------------------------
   SYNCHRO FIREBASE EN LIVE
---------------------------*/
db.collection("markers").onSnapshot(snap => {
    markerLayer.innerHTML = "";
    snap.forEach(doc => displayMarker(doc.id, doc.data()));
});

/* ----------- MENU COMPACT ----------- */
const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const preview = document.getElementById("icon-preview");
const validateBtn = document.getElementById("validate-point");
const cancelBtn = document.getElementById("cancel-point");

let addMode = false;
let tempX, tempY;

/* Ouvrir menu */
document.getElementById("new-point-btn").addEventListener("click", () => {
    addMode = true;
    alert("Clique sur la carte pour placer un nouveau point");
});

/* Clique sur la carte = position du point */
mapContainer.addEventListener("click", (e) => {
    if (!addMode) return;

    const rect = mapContainer.getBoundingClientRect();
    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    pointName.value = "";
    pointIcon.value = "";
    preview.classList.add("hidden");

    pointMenu.classList.remove("hidden");
});

/* Aperçu icône */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) {
        preview.classList.add("hidden");
        return;
    }
    preview.src = "icons/" + pointIcon.value;
    preview.classList.remove("hidden");
});

/* Valider */
validateBtn.addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) {
        alert("Nom + icône obligatoire");
        return;
    }

    db.collection("markers").add({
        x: tempX,
        y: tempY,
        name: pointName.value,
        icon: pointIcon.value
    });

    pointMenu.classList.add("hidden");
    addMode = false;
});

/* Annuler */
cancelBtn.addEventListener("click", () => {
    pointMenu.classList.add("hidden");
    addMode = false;
});











