/* ============================
   VARIABLES
============================ */
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const iconPreview = document.getElementById("icon-preview");

let posX = 0, posY = 0;
let startX = 0, startY = 0;
let isDragging = false;
let scale = 1;

let waitingForClick = false;   // <--- placement après validation

/* ============================
   DRAG
============================ */
mapContainer.addEventListener("mousedown", (e) => {
    if (waitingForClick) return;

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
    updateMarkers();
});

/* ============================
   ZOOM
============================ */
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomSpeed = 0.1;
    scale += (e.deltaY < 0 ? zoomSpeed : -zoomSpeed);

    if (scale < 0.5) scale = 0.5;
    if (scale > 4) scale = 4;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    updateMarkers();
});

/* ============================
   MARQUEURS
============================ */
let markers = [];

function addMarker(x, y, icon, name) {
    const img = document.createElement("img");
    img.src = "icons/" + icon;
    img.className = "marker";
    img.title = name;

    const data = { x, y, icon, name, element: img };
    markers.push(data);

    markerLayer.appendChild(img);
    updateMarkers();
}

function updateMarkers() {
    markers.forEach(m => {
        m.element.style.left = (m.x * scale + posX) + "px";
        m.element.style.top = (m.y * scale + posY) + "px";
        m.element.style.width = (40 * scale) + "px";
        m.element.style.height = (40 * scale) + "px";
    });
}

/* ============================
   NOUVEAU POINT
============================ */
document.getElementById("new-point-btn").addEventListener("click", () => {
    pointName.value = "";
    pointIcon.value = "";
    iconPreview.classList.add("hidden");

    pointMenu.classList.remove("hidden");
});

/* APERCU ICONE */
pointIcon.addEventListener("change", () => {
    if (!pointIcon.value) {
        iconPreview.classList.add("hidden");
        return;
    }
    iconPreview.src = "icons/" + pointIcon.value;
    iconPreview.classList.remove("hidden");
});

/* VALIDER = LE PROCHAIN CLIC PLACE LE POINT */
document.getElementById("validate-point").addEventListener("click", () => {
    if (!pointName.value || !pointIcon.value) {
        alert("Nom + icône obligatoires !");
        return;
    }

    pointMenu.classList.add("hidden");

    waitingForClick = true;
clickHint.classList.remove("hidden");

});

/* ANNULER */
document.getElementById("cancel-point").addEventListener("click", () => {
    pointMenu.classList.add("hidden");
});

/* CLICK CARTE = PLACEMENT FINAL */
mapContainer.addEventListener("click", (e) => {
    // On ne place que si on attend le clic ET si on ne glisse pas la carte
    if (!waitingForClick || isDragging) return;

    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / currentZoom;
    const y = (e.clientY - rect.top - offsetY) / currentZoom;

    // Création du marqueur
    const marker = document.createElement("img");
    marker.src = "icons/" + selectedIcon;  // l'image choisie
    marker.className = "marker";
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.style.transform = `translate(-50%, -50%) scale(${1 / currentZoom})`; // suivre le zoom
    marker.title = selectedName; // afficher le nom au survol

    markerLayer.appendChild(marker);

    // Sauvegarde Firebase
    saveMarkerToFirebase(x, y, selectedName, selectedIcon);

    // Reset
    waitingForClick = false;
    clickHint.classList.add("hidden");
});











