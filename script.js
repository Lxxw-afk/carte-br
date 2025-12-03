//----------------------------------------
// VARIABLES DE BASE
//----------------------------------------
const mapContainer = document.getElementById("map-container");
const mapInner     = document.getElementById("map-inner");
const mapImg       = document.getElementById("map");

// PAN (déplacement)
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// ZOOM
let zoom = 1;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

//----------------------------------------
// FONCTION POUR METTRE À JOUR LA TRANSFORMATION
//----------------------------------------
function updateTransform() {
    mapInner.style.transformOrigin = "0 0";

    mapInner.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

    updateMarkers();
}

//----------------------------------------
// DRAG COMME GOOGLE MAPS
//----------------------------------------
mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;

    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;

    mapContainer.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    updateTransform();
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    mapContainer.style.cursor = "grab";
});

//----------------------------------------
// ZOOM À LA MOLETTE
//----------------------------------------
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offsetX) / zoom;
    const worldY = (mouseY - offsetY) / zoom;

    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));

    offsetX = mouseX - worldX * zoom;
    offsetY = mouseY - worldY * zoom;

    updateTransform();
}, { passive: false });

//----------------------------------------
// MARQUEURS
//----------------------------------------

// Calque des marqueurs
const markerLayer = document.createElement("div");
markerLayer.id = "marker-layer";
markerLayer.style.position = "absolute";
markerLayer.style.top = "0";
markerLayer.style.left = "0";
markerLayer.style.width = "100%";
markerLayer.style.height = "100%";
markerLayer.style.pointerEvents = "none";
mapContainer.appendChild(markerLayer);

// Liste des marqueurs {x,y,element}
let markers = [];

// Ajouter un marqueur
function addMarker(x, y) {
    const marker = document.createElement("img");
    marker.src = "icons/weed.png";  // icône provisoire
    marker.className = "marker";
    marker.style.position = "absolute";
    marker.style.width = "40px";
    marker.style.height = "40px";
    marker.style.pointerEvents = "auto";
    marker.style.left = x + "px";
    marker.style.top = y + "px";
    marker.style.transform = "translate(-50%, -50%)";

    markerLayer.appendChild(marker);

    markers.push({ x, y, element: marker });
    updateMarkers();
}

// Met à jour la taille/position visuelle des marqueurs
function updateMarkers() {
    markers.forEach(m => {
        m.element.style.transform =
            `translate(-50%, -50%) scale(${zoom})`;
    });
}

//----------------------------------------
// INITIALISATION
//----------------------------------------
updateTransform();









