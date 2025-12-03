/***************************************************
 * CONFIG FIREBASE (mets TA config ici)
 ***************************************************/
const firebaseConfig = {
    apiKey: "TA_CLEF",
    authDomain: "ton-projet.firebaseapp.com",
    databaseURL: "https://ton-projet-default-rtdb.firebaseio.com",
    projectId: "ton-projet",
    storageBucket: "ton-projet.appspot.com",
    messagingSenderId: "xxx",
    appId: "xxx"
};

const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/***************************************************
 * VARIABLES GLOBALES
 ***************************************************/
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let currentZoom = 1;

let waitingForClick = false; // pour placer un marqueur
let selectedMarker = null;

/***************************************************
 * DRAG DEPLACEMENT (STYLE GOOGLE MAPS)
 ***************************************************/
mapContainer.addEventListener("mousedown", (e) => {
    if (waitingForClick) return; // si placement marqueur → pas drag
    isDragging = true;

    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});
mapContainer.addEventListener("mouseup", () => {
    isDragging = false;
});
mapContainer.addEventListener("mouseleave", () => {
    isDragging = false;
});
mapContainer.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;

    mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentZoom})`;
    markerLayer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentZoom})`;
});

/***************************************************
 * ZOOM MOLETTE
 ***************************************************/
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomIntensity = 0.1;
    if (e.deltaY < 0) currentZoom += zoomIntensity;
    else currentZoom -= zoomIntensity;

    currentZoom = Math.min(Math.max(currentZoom, 0.5), 4);

    mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentZoom})`;
    markerLayer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${currentZoom})`;
});

/***************************************************
 * BOUTON "NOUVEAU POINT"
 ***************************************************/
document.getElementById("new-point-btn").addEventListener("click", () => {
    waitingForClick = true;
    document.getElementById("place-info").style.display = "block";
});

/***************************************************
 * PLACEMENT MARQUEUR AU CLIC
 ***************************************************/
mapContainer.addEventListener("click", (e) => {
    if (!waitingForClick || isDragging) return;

    waitingForClick = false;
    document.getElementById("place-info").style.display = "none";

    const rect = mapContainer.getBoundingClientRect();

    const x = (e.clientX - rect.left - offsetX) / currentZoom;
    const y = (e.clientY - rect.top - offsetY) / currentZoom;

    // ouvrir menu ajout
    openMarkerCreationMenu(x, y);
});

/***************************************************
 * MENU DE CREATION DU MARQUEUR
 ***************************************************/
function openMarkerCreationMenu(x, y) {
    const name = prompt("Nom du point :");
    if (!name) return;

    const icon = prompt("Nom du fichier icône (dans /icons) :\nEx: weed.png");
    if (!icon) return;

    // créer dans firebase
    const newMarker = database.ref("markers").push({
        x, y, name, icon
    });

    addMarkerToMap(newMarker.key, x, y, name, icon);
}

/***************************************************
 * AJOUT MARQUEUR VISUEL
 ***************************************************/
function addMarkerToMap(id, x, y, name, icon) {
    const marker = document.createElement("img");
    marker.src = "icons/" + icon;
    marker.classList.add("marker");
    marker.style.left = x + "px";
    marker.style.top = y + "px";

    marker.dataset.id = id;
    marker.dataset.icon = icon;
    marker.title = name;

    /*************** CLIC DROIT = MENU ****************/
    marker.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        selectedMarker = marker;
        openMarkerMenu(e.pageX, e.pageY);
    });

    markerLayer.appendChild(marker);
}

/***************************************************
 * MENU CONTEXTUEL MARQUEUR
 ***************************************************/
const menu = document.getElementById("marker-menu");

function openMarkerMenu(x, y) {
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.remove("hidden");
}

document.addEventListener("click", () => {
    menu.classList.add("hidden");
});

/***************************************************
 * ACTIONS MENU : MODIFIER / SUPPRIMER / DEPLACER
 ***************************************************/
document.getElementById("delete-marker").addEventListener("click", () => {
    if (!selectedMarker) return;

    database.ref("markers/" + selectedMarker.dataset.id).remove();
    selectedMarker.remove();

    menu.classList.add("hidden");
});

document.getElementById("edit-marker").addEventListener("click", () => {
    if (!selectedMarker) return;

    const newName = prompt("Nouveau nom :", selectedMarker.title);
    if (newName) selectedMarker.title = newName;

    const newIcon = prompt("Nouvelle icône :", selectedMarker.dataset.icon);
    if (newIcon) {
        selectedMarker.src = "icons/" + newIcon;
        selectedMarker.dataset.icon = newIcon;
    }

    database.ref("markers/" + selectedMarker.dataset.id).update({
        name: selectedMarker.title,
        icon: selectedMarker.dataset.icon
    });

    menu.classList.add("hidden");
});

/***************************************************
 * DEPLACER MARQUEUR
 ***************************************************/
document.getElementById("move-marker").addEventListener("click", () => {
    menu.classList.add("hidden");
    alert("Clique sur la carte pour choisir la nouvelle position.");

    const tempMove = (e) => {
        const rect = mapContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left - offsetX) / currentZoom;
        const y = (e.clientY - rect.top - offsetY) / currentZoom;

        selectedMarker.style.left = x + "px";
        selectedMarker.style.top = y + "px";

        database.ref("markers/" + selectedMarker.dataset.id).update({ x, y });

        mapContainer.removeEventListener("click", tempMove);
    };

    mapContainer.addEventListener("click", tempMove);
});

/***************************************************
 * CHARGER LES MARQUEURS A L’OUVERTURE
 ***************************************************/
database.ref("markers").on("value", (snapshot) => {
    markerLayer.innerHTML = "";

    snapshot.forEach((child) => {
        const data = child.val();
        addMarkerToMap(child.key, data.x, data.y, data.name, data.icon);
    });
});









