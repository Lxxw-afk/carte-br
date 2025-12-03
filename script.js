let offsetX = 0;
let offsetY = 0;
let zoom = 1;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

let isDragging = false;
let startX, startY;

// éléments
const mapContainer = document.getElementById("map-container");
const mapInner     = document.getElementById("map-inner");
const markerLayer  = document.getElementById("marker-layer");
const mapImg       = document.getElementById("map");

// =============
// TRANSFORM
// =============
function updateTransform() {
    mapInner.style.transformOrigin = "0 0";
    markerLayer.style.transformOrigin = "0 0";

    const transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

    mapInner.style.transform = transform;
    markerLayer.style.transform = transform;

    // taille des marqueurs
    const scale = 1 / zoom;
    markerLayer.style.setProperty("--markerScale", scale);
}

// =============
// DRAG COMME GOOGLE MAPS
// =============
mapContainer.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // clic gauche uniquement

    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;

    mapContainer.classList.add("dragging");
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    updateTransform();
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    mapContainer.classList.remove("dragging");
});

// =============
// ZOOM MOLETTE
// =============
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offsetX) / zoom;
    const worldY = (mouseY - offsetY) / zoom;

    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));

    offsetX = mouseX - worldX * zoom;
    offsetY = mouseY - worldY * zoom;

    updateTransform();
}, { passive: false });

// =============
// MARQUEURS déjà placés + futur système
// =============
const markers = {};

export function addMarker(x, y, name, icon) {
    const id = "m" + Date.now();
    markers[id] = { x, y, name, icon };

    const marker = document.createElement("div");
    marker.className = "marker";
    marker.style.left = x + "px";
    marker.style.top = y + "px";
    marker.dataset.id = id;

    if (icon) {
        const img = document.createElement("img");
        img.src = "icons/" + icon + ".png";
        img.className = "marker-img";
        marker.appendChild(img);
    } else {
        const dot = document.createElement("span");
        dot.className = "marker-default";
        marker.appendChild(dot);
    }

    const label = document.createElement("div");
    label.className = "marker-label";
    label.textContent = name;
    marker.appendChild(label);

    markerLayer.appendChild(marker);
    updateTransform();
}

updateTransform();









