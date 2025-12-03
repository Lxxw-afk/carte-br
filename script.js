/* ============================
   VARIABLES
============================ */
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

let posX = 0, posY = 0;
let startX = 0, startY = 0;
let isDragging = false;

let scale = 1;

/* ============================
   DEPLACEMENT
============================ */
mapContainer.addEventListener("mousedown", (e) => {
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
   ZOOM MOLETTE
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

    const obj = { x, y, icon, name, element: img };
    markers.push(obj);

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
let addMode = false;
let tempX, tempY;

document.getElementById("new-point-btn").addEventListener("click", () => {
    addMode = true;
    alert("Clique sur la carte pour placer ton point.");
});

mapContainer.addEventListener("click", (e) => {
    if (!addMode || isDragging) return;

    const rect = mapContainer.getBoundingClientRect();
    tempX = (e.clientX - rect.left - posX) / scale;
    tempY = (e.clientY - rect.top - posY) / scale;

    document.getElementById("point-name").value = "";
    document.getElementById("point-icon").value = "";
    document.getElementById("icon-preview").classList.add("hidden");

    document.getElementById("point-menu").classList.remove("hidden");
});

/* APERCU ICONE */
document.getElementById("point-icon").addEventListener("change", () => {
    const val = document.getElementById("point-icon").value;
    const preview = document.getElementById("icon-preview");

    if (!val) return preview.classList.add("hidden");

    preview.src = "icons/" + val;
    preview.classList.remove("hidden");
});

/* VALIDER */
document.getElementById("validate-point").addEventListener("click", () => {
    const name = document.getElementById("point-name").value;
    const icon = document.getElementById("point-icon").value;

    if (!name || !icon) {
        alert("Nom et icône obligatoires !");
        return;
    }

    addMarker(tempX, tempY, icon, name);

    document.getElementById("point-menu").classList.add("hidden");
    addMode = false;
});

/* ANNULER */
document.getElementById("cancel-point").addEventListener("click", () => {
    document.getElementById("point-menu").classList.add("hidden");
    addMode = false;
});












