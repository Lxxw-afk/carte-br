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

// Remplir dropdown d’icônes
iconList.forEach(icon => {
    const op = document.createElement("option");
    op.value = icon;
    op.textContent = icon.replace(".png", "");
    pointIcon.appendChild(op);
});

/* ============================================================
   VARIABLES CARTE
============================================================ */
let posX = 0, posY = 0;
let scale = 1;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;

let markers = [];
let waitingForPlacement = false;
let tempX = 0, tempY = 0;

let selectedMarker = null;
let moveMode = false;

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

    const mx = e.clientX;
    const my = e.clientY;

    const oldScale = scale;
    const zoomSpeed = 0.1;

    scale += (e.deltaY < 0 ? zoomSpeed : -zoomSpeed);
    scale = Math.max(0.5, Math.min(4, scale));

    const dx = mx - posX;
    const dy = my - posY;

    posX -= (dx / oldScale) * (scale - oldScale);
    posY -= (dy / oldScale) * (scale - oldScale);

    updateMap();
});

/* ============================================================
   METTRE À JOUR CARTE + MARKERS
============================================================ */
function updateMap() {
    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;
    updateMarkerDisplay();
}

function updateMarkerDisplay() {
    markers.forEach(marker => {
        const x = marker.dataset.x;
        const y = marker.dataset.y;

        marker.style.left = (x * scale) + "px";
        marker.style.top = (y * scale) + "px";

        marker.style.width = (40 / scale) + "px";
        marker.style.height = (40 / scale) + "px";
    });
}

/* ============================================================
   AJOUTER MARQUEUR
============================================================ */
function addMarker(x, y, icon, name) {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.className = "marker";
    img.title = name;

    img.dataset.x = x;
    img.dataset.y = y;

    // clic droit sur un marqueur
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

    // mode déplacement
    if (moveMode && selectedMarker) {
        const rect = mapContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left - posX) / scale;
        const y = (e.clientY - rect.top - posY) / scale;

        selectedMarker.dataset.x = x;
        selectedMarker.dataset.y = y;

        moveMode = false;
        selectedMarker = null;
        updateMarkerDisplay();
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
   PREVIEW ICÔNE
============================================================ */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) return iconPreview.classList.add("hidden");
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});

/* ============================================================
   VALIDER AJOUT POINT
============================================================ */
document.getElementById("save-point").addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) {
        alert("Nom + icône obligatoires !");
        return;
    }

    addMarker(tempX, tempY, pointIcon.value, pointName.value);

    pointMenu.classList.add("hidden");
});

/* ANNULER */
document.getElementById("cancel-point").addEventListener("click", () => {
    pointMenu.classList.add("hidden");
    step1.classList.add("hidden");
    waitingForPlacement = false;
});

/* ============================================================
   MENU CLIC DROIT : ACTIONS
============================================================ */

// SUPPRIMER
deleteBtn.addEventListener("click", () => {
    if (!selectedMarker) return;

    selectedMarker.remove();
    markers = markers.filter(m => m !== selectedMarker);

    markerMenu.style.display = "none";
});

// MODIFIER
editBtn.addEventListener("click", () => {
    if (!selectedMarker) return;

    const newName = prompt("Nouveau nom :", selectedMarker.title);
    if (newName) selectedMarker.title = newName;

    const newIcon = prompt("Nouvelle icône :", selectedMarker.src.split("/").pop());
    if (newIcon) selectedMarker.src = "icons/" + newIcon;

    markerMenu.style.display = "none";
});

// DEPLACER
moveBtn.addEventListener("click", () => {
    moveMode = true;
    markerMenu.style.display = "none";
});

/* Fermer menu clic droit si on clique ailleurs */
window.addEventListener("click", () => {
    if (!moveMode) markerMenu.style.display = "none";
});













