/* -------------------------
   CONFIG FIREBASE
---------------------------*/
const firebaseConfig = {
    apiKey: "AIzaSyAOl4dbsUaqmp9S0OBvx3A7F6jw4E3K4TE",
    authDomain: "carte-br.firebaseapp.com",
    projectId: "carte-br",
    storageBucket: "carte-br.firebasestorage.app",
    messagingSenderId: "698417792662",
    appId: "1:698417792662:web:4766a306741b5c71724b7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* -------------------------
   VARIABLES
---------------------------*/
const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const map = document.getElementById("map");
const markerLayer = document.getElementById("marker-layer");
let scale = 1;
let isDragging = false;
let startX, startY;
let posX = 0, posY = 0;

let addingPoint = false;

/* -------------------------
   MODE AJOUT DE POINT
---------------------------*/
document.getElementById("new-point-btn").addEventListener("click", () => {
    addingPoint = true;
    alert("Clique sur la carte pour ajouter un point");
});

/* -------------------------
   DEPLACEMENT (GOOGLE MAPS)
---------------------------*/
mapContainer.addEventListener("mousedown", (e) => {
    if (addingPoint) return;
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
});

window.addEventListener("mouseup", () => {
    isDragging = false;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging || addingPoint) return;

    posX = e.clientX - startX;
    posY = e.clientY - startY;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});

/* -------------------------
   ZOOM MOLETTE
---------------------------*/
mapContainer.addEventListener("wheel", (e) => {
    e.preventDefault();

    const zoomIntensity = 0.1;
    
    if (e.deltaY < 0) scale += zoomIntensity;
    else scale -= zoomIntensity;

    if (scale < 0.2) scale = 0.2;
    if (scale > 5) scale = 5;

    mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    markerLayer.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
});

/* -------------------------
   CLICK CARTE POUR AJOUTER
---------------------------*/
mapContainer.addEventListener("click", (e) => {
    if (!addingPoint) return;

    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    openMarkerCreationMenu(x, y);
});

/* -------------------------
   MENU CREATION MARQUEUR
---------------------------*/
function openMarkerCreationMenu(x, y) {
    const name = prompt("Nom du point :");
    if (!name) {
        addingPoint = false;
        return;
    }

    const icon = prompt("Nom du fichier icône (ex: weed.png) :");
    if (!icon) {
        addingPoint = false;
        return;
    }

    saveMarkerToFirebase(x, y, name, icon);

    addingPoint = false;
}

/* -------------------------
   SAUVEGARDE FIREBASE
---------------------------*/
function saveMarkerToFirebase(x, y, name, icon) {
    db.collection("markers").add({
        x, y, name, icon
    });
}

/* -------------------------
   AFFICHAGE DES MARQUEURS
---------------------------*/
function displayMarker(id, data) {
    const marker = document.createElement("img");
    marker.classList.add("marker");
    marker.src = `icons/${data.icon}`;
    marker.style.left = data.x + "px";
    marker.style.top = data.y + "px";
    marker.title = data.name;

    // clic droit → menu
    marker.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const choice = prompt("1 = Modifier\n2 = Supprimer\n3 = Déplacer");

        if (choice == "2") {
            db.collection("markers").doc(id).delete();
        }

        if (choice == "1") {
            const newName = prompt("Nouveau nom :", data.name);
            if (newName) {
                db.collection("markers").doc(id).update({ name: newName });
            }
        }

        if (choice == "3") {
            alert("Clique pour choisir la nouvelle position...");
            addingPoint = true;

            mapContainer.addEventListener("click", function move(e2) {
                const rect = mapContainer.getBoundingClientRect();
                const newX = (e2.clientX - rect.left - posX) / scale;
                const newY = (e2.clientY - rect.top - posY) / scale;

                db.collection("markers").doc(id).update({
                    x: newX,
                    y: newY
                });

                addingPoint = false;
                mapContainer.removeEventListener("click", move);
            });
        }
    });

    markerLayer.appendChild(marker);
}

/* -------------------------
   SYNCHRONISATION LIVE
---------------------------*/
db.collection("markers").onSnapshot(snapshot => {
    markerLayer.innerHTML = "";
    snapshot.forEach(doc => displayMarker(doc.id, doc.data()));
});











