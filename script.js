// ------------------------------
// 🔥 Firebase
// ------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyA0I4Ds9LuampPGS0Bvx3A76Fjw4E3K4TE",
    authDomain: "carte-br.firebaseapp.com",
    projectId: "carte-br",
    storageBucket: "carte-br.appspot.com",
    messagingSenderId: "698417729622",
    appId: "1:698417729622:web:4766a306741b5c71724b7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// ------------------------------
// ELEMENTS
// ------------------------------
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");
const addPointBtn = document.getElementById("addPointBtn");
const markerMenu = document.getElementById("markerMenu");

let placingMarker = false;
let tempClick = { x: 0, y: 0 };

// ------------------------------
// DEPLACEMENT + ZOOM
// ------------------------------
let dragging = false;
let lastX = 0;
let lastY = 0;
let offsetX = 0;
let offsetY = 0;
let zoom = 1;

mapContainer.addEventListener("mousedown", (e) => {
    if (placingMarker) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

mapContainer.addEventListener("mouseup", () => dragging = false);
mapContainer.addEventListener("mouseleave", () => dragging = false);

mapContainer.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    updateTransform();
});

mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom = Math.min(3, Math.max(0.5, zoom + delta));
    updateTransform();
});

function updateTransform() {
    const transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;

    mapInner.style.transformOrigin = "0 0";
    markerLayer.style.transformOrigin = "0 0";

    mapInner.style.transform = transform;
    markerLayer.style.transform = transform;
}


// ------------------------------
// AJOUT DE POINTS
// ------------------------------
addPointBtn.addEventListener("click", () => {
    placingMarker = true;
    alert("Clique sur la carte pour placer un point.");
});

mapContainer.addEventListener("click", (e) => {
    if (!placingMarker) return;

    const rect = mapInner.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / zoom;
    const y = (e.clientY - rect.top - offsetY) / zoom;

    tempClick = { x, y };

    markerMenu.classList.remove("hidden");
    placingMarker = false;
});

document.getElementById("confirmMarker").addEventListener("click", () => {
    const name = document.getElementById("markerName").value;
    const icon = document.getElementById("markerIcon").value;

    saveMarkerToFirebase(tempClick.x, tempClick.y, name, icon);

    markerMenu.classList.add("hidden");
});


// ------------------------------
// FIREBASE : SAUVEGARDE + CHARGEMENT
// ------------------------------
function saveMarkerToFirebase(x, y, name, icon) {
    db.ref("markers").push({ x, y, name, icon });
}

db.ref("markers").on("value", (snapshot) => {
    markerLayer.innerHTML = "";  
    snapshot.forEach(item => {
        const data = item.val();
        createMarkerElement(data.x, data.y, data.name, data.icon);
    });
});


// ------------------------------
// CREATION VISUELLE DU MARQUEUR
// ------------------------------
function createMarkerElement(x, y, name, icon) {
    const marker = document.createElement("img");
    marker.src = icon;
    marker.classList.add("marker");
    marker.style.left = x + "px";
    marker.style.top = y + "px";
    marker.title = name;

    markerLayer.appendChild(marker);
}





