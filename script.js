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

/* ============================================================
   LISTE DES ICONES
============================================================ */
const iconList = [
    "Meth.png",
    "cocaine.png",
    "munitions.png",
    "organes.png",
    "weed.png"
];

// remplir menu déroulant
iconList.forEach(icon => {
    const op = document.createElement("option");
    op.value = icon;
    op.textContent = icon.replace(".png", "");
    pointIcon.appendChild(op);
});

/* ============================================================
   VARIABLES CARTE
============================================================ */
let posX = 0, posY = 0;         // position de la carte
let scale = 1;                 // zoom
let isDragging = false;
let dragStartX = 0, dragStartY = 0;

let waitingForPlacement = false;
let tempX = 0, tempY = 0;

// tableau des marqueurs
let markers = [];

/* ============================================================
   DRAG (déplacement carte)
============================================================ */
mapContainer.addEventListener("mousedown", (e) => {
    if (waitingForPlacement) return;

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

    updateMapPosition();
});

/* ============================================================
   ZOOM (centré sur souris)
============================================================ */
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const prevScale = scale;
    const zoomSpeed = 0.1;

    scale += (e.deltaY < 0 ? zoomSpeed : -zoomSpeed);
    scale = Math.max(0.5, Math.min(4, scale));

    // calcul point de référence pour zoom centré
    const dx = mouseX - posX;
    const dy = mouseY - posY;

    posX -= (dx / prevScale) * (scale - prevScale);
    posY -= (dy / prevScale) * (scale - prevScale);

    updateMapPosition();
});

/* ============================================================
   METTRE À JOUR POSITION CARTE + MARKERS
============================================================ */
function updateMapPosition() {
    mapInner.style.transform =
        `translate(${posX}px, ${posY}px) scale(${scale})`;

    markerLayer.style.transform =
        `translate(${posX}px, ${posY}px)`;

    updateMarkerDisplay();
}

/* ============================================================
   GESTION DES MARQUEURS
============================================================ */
function addMarker(x, y, icon, name) {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.className = "marker";
    img.title = name;

    img.dataset.x = x;
    img.dataset.y = y;

    markerLayer.appendChild(img);
    markers.push(img);

    updateMarkerDisplay();
}

function updateMarkerDisplay() {
    markers.forEach(marker => {
        const x = marker.dataset.x;
        const y = marker.dataset.y;

        // position réelle
        marker.style.left = x * scale + "px";
        marker.style.top = y * scale + "px";

        // taille inverse du zoom
        marker.style.width = (40 / scale) + "px";
        marker.style.height = (40 / scale) + "px";
    });
}

/* ============================================================
   BOUTON : NOUVEAU POINT (ÉTAPE 1)
============================================================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
    waitingForPlacement = true;
    step1.classList.remove("hidden");
});

/* ============================================================
   CLICK SUR CARTE → placer coordinateurs (ÉTAPE 2)
============================================================ */
mapContainer.addEventListener("click", (e) => {
    if (!waitingForPlacement || isDragging) return;

    const rect = mapContainer.getBoundingClientRect();

    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    waitingForPlacement = false;
    step1.classList.add("hidden");
    pointMenu.classList.remove("hidden");
});

/* Aperçu icône */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) return iconPreview.classList.add("hidden");
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});

/* ============================================================
   VALIDER LE POINT
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












