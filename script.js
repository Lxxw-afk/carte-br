/* ============================
   VARIABLES
============================ */

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const step1 = document.getElementById("step1");
const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const iconPreview = document.getElementById("icon-preview");

/* ============================
   LISTE DES ICONES DISPONIBLES
============================ */

const iconList = [
    "Meth.png",
    "cocaine.png",
    "munitions.png",
    "organes.png",
    "weed.png"
];

/* Remplir le menu automatiquement */
iconList.forEach(icon => {
    const option = document.createElement("option");
    option.value = icon;
    option.textContent = icon.replace(".png", "");
    pointIcon.appendChild(option);
});


/* ============================
   VARIABLES CARTE
============================ */
let markers = [];
let isDragging = false;
let startX = 0, startY = 0;
let posX = 0, posY = 0;
let scale = 1;

let waitingForPlacement = false;
let tempX = 0, tempY = 0;


/* ============================
   DRAG (Déplacement carte)
============================ */
mapContainer.addEventListener("mousedown", (e) => {
    if (waitingForPlacement) return;

    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;

    mapContainer.style.cursor = "grabbing";
});

window.addEventListener("mouseup", () => {
    isDragging = false;
    mapContainer.style.cursor = "grab";
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});


/* ============================
   ZOOM
============================ */
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomSpeed = 0.1;
    scale += (e.deltaY < 0 ? zoomSpeed : -zoomSpeed);

    scale = Math.max(0.5, Math.min(4, scale));

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});


/* ============================
   BOUTON "Nouveau point"
============================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
    step1.classList.remove("hidden");
    waitingForPlacement = true;
});


/* ============================
   CLICK SUR LA CARTE POUR POSER
============================ */
mapContainer.addEventListener("click", (e) => {
    if (!waitingForPlacement || isDragging) return;

    const rect = mapContainer.getBoundingClientRect();
    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    step1.classList.add("hidden");
    pointMenu.classList.remove("hidden");
});


/* ============================
   APERCU ICONE
============================ */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) {
        iconPreview.classList.add("hidden");
        return;
    }
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});


/* ============================
   VALIDER LE POINT
============================ */
document.getElementById("save-point").addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) {
        alert("Nom + icône obligatoires !");
        return;
    }

    addMarker(tempX, tempY, pointIcon.value, pointName.value);

    pointMenu.classList.add("hidden");
    waitingForPlacement = false;
});


/* ============================
   ANNULER
============================ */
document.getElementById("cancel-point").addEventListener("click", () => {
    pointMenu.classList.add("hidden");
    step1.classList.add("hidden");
    waitingForPlacement = false;
});


/* ============================
   CREER LE MARQUEUR
============================ */
function addMarker(x, y, icon, name) {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.className = "marker";
    img.title = name;

    img.style.left = x + "px";
    img.style.top = y + "px";

    markerLayer.appendChild(img);
    markers.push({ x, y, icon, name, element: img });
}











