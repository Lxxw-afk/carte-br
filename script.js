/* ============================ VARIABLES ============================ */

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const step1 = document.getElementById("step1");
const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const iconPreview = document.getElementById("icon-preview");

let markers = [];
let isDragging = false;
let startX = 0, startY = 0;
let posX = 0, posY = 0;
let scale = 1;

let waitingForPlacement = false;
let tempX = 0, tempY = 0;

/* ============================ DRAG ============================ */

mapContainer.addEventListener("mousedown", (e) => {
    if (waitingForPlacement) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
});

window.addEventListener("mouseup", () => { isDragging = false; });
window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});

/* ============================ ZOOM ============================ */
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const speed = 0.1;
    scale += (e.deltaY < 0 ? speed : -speed);
    scale = Math.min(Math.max(0.5, scale), 4);
    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});

/* ============================ AJOUT MARQUEUR ============================ */

document.getElementById("new-point-btn").addEventListener("click", () => {
    // Étape 1 → afficher le message
    step1.classList.remove("hidden");
    waitingForPlacement = true;
});

mapContainer.addEventListener("click", (e) => {
    if (!waitingForPlacement || isDragging) return;

    const rect = mapContainer.getBoundingClientRect();
    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    step1.classList.add("hidden");

    // Étape 2 → ouvrir le menu
    pointMenu.classList.remove("hidden");
});

/* Aperçu icône */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) return iconPreview.classList.add("hidden");
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});

/* Valider le point */
document.getElementById("save-point").addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) {
        alert("Nom + icône obligatoires !");
        return;
    }

    addMarker(tempX, tempY, pointIcon.value, pointName.value);

    // Reset
    pointMenu.classList.add("hidden");
    waitingForPlacement = false;
});

/* Annuler */
document.getElementById("cancel-point").addEventListener("click", () => {
    waitingForPlacement = false;
    pointMenu.classList.add("hidden");
    step1.classList.add("hidden");
});

/* ============================ CREATION DU MARQUEUR ============================ */

function addMarker(x, y, icon, name) {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.className = "marker";
    img.title = name;

    img.style.left = x + "px";
    img.style.top = y + "px";

    markerLayer.appendChild(img);
    markers.push({x, y, icon, name, element: img});
}










