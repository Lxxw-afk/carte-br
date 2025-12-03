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
    setTimeout(() => isDragging = false, 10);
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
let markers = [];

// calque déjà présent dans HTML
const markerLayer = document.getElementById("marker-layer");

function addMarker(x, y) {
    const marker = document.createElement("img");
    marker.src = "icons/weed.png"; // TEMPORAIRE
    marker.className = "marker";

    marker.style.left = x + "px";
    marker.style.top = y + "px";

    markerLayer.appendChild(marker);

    markers.push({ x, y, element: marker });
    updateMarkers();
}

function updateMarkers() {
    markers.forEach(m => {
        m.element.style.transform =
            `translate(-50%, -50%) scale(${zoom})`;
    });
}

//----------------------------------------
// NOUVEAU POINT (clic)
//----------------------------------------
let addingPoint = false;

const newPointBtn = document.getElementById("new-point-btn");
newPointBtn.addEventListener("click", () => {
    addingPoint = true;
    mapContainer.style.cursor = "crosshair";
});

mapContainer.addEventListener("click", (e) => {
    if (!addingPoint) return;
    if (isDragging) return;

    const rect = mapContainer.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const x = (mx - offsetX) / zoom;
    const y = (my - offsetY) / zoom;

    addMarker(x, y);

    addingPoint = false;
    mapContainer.style.cursor = "grab";
});

//----------------------------------------
updateTransform();










