/* ----------- FIREBASE ----------- */
const firebaseConfig = {
    apiKey: "AIzaSyA0i4Ds0gJluamp9SO0Bvx3A7GFjw4E3K4TE",
    authDomain: "carte-br.firebaseapp.com",
    projectId: "carte-br",
    storageBucket: "carte-br.firebasestorage.app",
    messagingSenderId: "698417792662",
    appId: "1:698417792662:web:4766a306741b5c71724b7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ----------- VARIABLES CARTE ----------- */
let isDragging = false;
let startX = 0, startY = 0;
let posX = 0, posY = 0;
let scale = 1;

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

/* ----------- DRAG MANUEL ----------- */
mapContainer.addEventListener("mousedown", (e) => {
    if (e.target.closest(".marker")) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
});

mapContainer.addEventListener("mouseup", () => {
    isDragging = false;
});

mapContainer.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    updateMarkerPositions();
});

/* ----------- ZOOM MOLETTE ----------- */
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomSpeed = 0.1;
    const delta = Math.sign(e.deltaY);

    scale += delta * -zoomSpeed;
    scale = Math.min(Math.max(scale, 0.5), 4);

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    updateMarkerPositions();
});

/* ----------- AJOUT DE POINT ----------- */
let addMode = false;
let tempX, tempY;

/* BTN NOUVEAU POINT */
document.getElementById("new-point-btn").addEventListener("click", () => {
    addMode = true;
    alert("Clique sur la carte pour placer un nouveau point.");
});

/* CLICK SUR LA CARTE */
mapContainer.addEventListener("click", (e) => {
    if (!addMode) return;

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
    const icon = document.getElementById("point-icon").value;
    const preview = document.getElementById("icon-preview");

    if (!icon) {
        preview.classList.add("hidden");
        return;
    }

    preview.src = "icons/" + icon;
    preview.classList.remove("hidden");
});

/* VALIDATION POINT */
document.getElementById("validate-point").addEventListener("click", () => {
    const name = document.getElementById("point-name").value;
    const icon = document.getElementById("point-icon").value;

    if (!name || !icon) {
        alert("Nom + icône obligatoire !");
        return;
    }

    db.collection("markers").add({
        x: tempX,
        y: tempY,
        name,
        icon
    });

    document.getElementById("point-menu").classList.add("hidden");
    addMode = false;
});

/* ANNULER */
document.getElementById("cancel-point").addEventListener("click", () => {
    document.getElementById("point-menu").classList.add("hidden");
    addMode = false;
});

/* ----------- AFFICHAGE DES MARKERS ----------- */
function updateMarkerPositions() {
    document.querySelectorAll(".marker").forEach(marker => {
        const data = marker.data;
        marker.style.left = (data.x * scale + posX) + "px";
        marker.style.top = (data.y * scale + posY) + "px";

        marker.querySelector("img").style.width = (40 * scale) + "px";
        marker.querySelector("img").style.height = (40 * scale) + "px";
    });
}

/* CHARGER MARKERS FIREBASE */
db.collection("markers").onSnapshot(snapshot => {
    markerLayer.innerHTML = "";

    snapshot.forEach(doc => {
        const d = doc.data();

        const marker = document.createElement("div");
        marker.classList.add("marker");

        marker.data = d;

        marker.innerHTML = `<img src="icons/${d.icon}" title="${d.name}">`;

        markerLayer.appendChild(marker);
    });

    updateMarkerPositions();
});












