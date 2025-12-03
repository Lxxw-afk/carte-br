/* ============================
   FIREBASE CONFIG
============================ */

const firebaseConfig = {
    apiKey: "TA_CLE",
    authDomain: "ton-projet.firebaseapp.com",
    databaseURL: "https://ton-projet-default-rtdb.firebaseio.com",
    projectId: "ton-projet",
    storageBucket: "ton-projet.appspot.com",
    messagingSenderId: "xxx",
    appId: "xxx"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ============================
   VARIABLES DOM
============================ */
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

/* ============================
   LISTE DES ICONES
============================ */
const iconList = ["Meth.png", "cocaine.png", "munitions.png", "organes.png", "weed.png"];

// Remplir liste icônes
iconList.forEach(icon => {
    let opt = document.createElement("option");
    opt.value = icon;
    opt.textContent = icon.replace(".png", "");
    pointIcon.appendChild(opt);
});

/* ============================
   VARIABLES CARTE
============================ */
let markers = {}; // stock par ID Firebase
let isDragging = false;
let posX = 0, posY = 0, startX = 0, startY = 0;
let scale = 1;
let waitingForPlacement = false;
let moveMode = false;
let markerToMove = null;

let tempX = 0, tempY = 0;

/* ============================
   DRAG
============================ */
mapContainer.addEventListener("mousedown", e => {
    if (waitingForPlacement || moveMode) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
});

window.addEventListener("mouseup", () => isDragging = false);

window.addEventListener("mousemove", e => {
    if (!isDragging) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    updateTransforms();
});

/* ============================
   ZOOM
============================ */
mapContainer.addEventListener("wheel", e => {
    e.preventDefault();
    scale += (e.deltaY < 0 ? 0.1 : -0.1);
    scale = Math.min(Math.max(scale, 0.5), 4);

    updateTransforms();
});

function updateTransforms() {
    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
}

/* ============================
   NOUVEAU POINT
============================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
    step1.classList.remove("hidden");
    waitingForPlacement = true;
});

/* ============================
   CLICK SUR LA CARTE
============================ */
mapContainer.addEventListener("click", e => {
    if (isDragging) return;

    // Déplacement d’un point
    if (moveMode && markerToMove) {
        const rect = mapContainer.getBoundingClientRect();
        let x = (e.clientX - rect.left - posX) / scale;
        let y = (e.clientY - rect.top - posY) / scale;

        db.ref("markers/" + markerToMove).update({ x, y });

        moveMode = false;
        markerToMove = null;
        markerMenu.style.display = "none";
        return;
    }

    // Placement d'un NOUVEAU point
    if (!waitingForPlacement) return;

    const rect = mapContainer.getBoundingClientRect();
    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    waitingForPlacement = false;
    step1.classList.add("hidden");
    pointMenu.classList.remove("hidden");
});

/* ============================
   APERCU ICONE
============================ */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) return iconPreview.classList.add("hidden");
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});

/* ============================
   ENREGISTRER LE POINT
============================ */
document.getElementById("save-point").addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) return alert("Nom + icône obligatoires !");

    let ref = db.ref("markers").push();
    ref.set({
        x: tempX,
        y: tempY,
        name: pointName.value,
        icon: pointIcon.value
    });

    pointMenu.classList.add("hidden");
});

/* ANNULER */
document.getElementById("cancel-point").addEventListener("click", () => {
    pointMenu.classList.add("hidden");
});

/* ============================
   CHARGEMENT DES POINTS
============================ */
db.ref("markers").on("value", snap => {
    markerLayer.innerHTML = "";
    markers = snap.val() || {};

    Object.keys(markers).forEach(id => {
        createMarker(id, markers[id]);
    });
});

/* ============================
   CREER UN MARQUEUR
============================ */
function createMarker(id, data) {
    const img = document.createElement("img");
    img.src = "icons/" + data.icon;
    img.className = "marker";
    img.title = data.name;

    img.style.left = data.x + "px";
    img.style.top = data.y + "px";

    img.addEventListener("contextmenu", e => {
        e.preventDefault();
        markerToMove = id;
        markerMenu.style.left = e.pageX + "px";
        markerMenu.style.top = e.pageY + "px";
        markerMenu.style.display = "flex";
    });

    markerLayer.appendChild(img);
}

/* ============================
   MENU CONTEXTUEL : ACTIONS
============================ */

// Supprimer
deleteBtn.addEventListener("click", () => {
    db.ref("markers/" + markerToMove).remove();
    markerMenu.style.display = "none";
});

// Modifier
editBtn.addEventListener("click", () => {
    let newName = prompt("Nouveau nom :", markers[markerToMove].name);
    let newIcon = prompt("Nouvelle icône :", markers[markerToMove].icon);

    if (newName && newIcon) {
        db.ref("markers/" + markerToMove).update({
            name: newName,
            icon: newIcon
        });
    }

    markerMenu.style.display = "none";
});

// Déplacer
moveBtn.addEventListener("click", () => {
    moveMode = true;
    markerMenu.style.display = "none";
});











