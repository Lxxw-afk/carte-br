/* ============================================================
   🔐 LOGIN
============================================================ */
const ACCESS_CODE = "BRIGADE2026";

loginBtn.onclick = () => {
  const value = document.getElementById("access-code").value.trim();
  const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
   
  if (value === ACCESS_CODE) {
    loginScreen.remove();
    app.classList.remove("hidden");
  } else {
    loginError.textContent = "Code incorrect";
  }
};

/* ============================================================
   FIREBASE INIT (FIX)
============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAoiD4sgUaamp0SGOBvx3A7FGjw4E3K4TE",
  authDomain: "carte-br.firebaseapp.com",
  projectId: "carte-br",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* ============================================================
   VARIABLES
============================================================ */
let posX = 0, posY = 0;
let scale = 1;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;

let waitingForPlacement = false;
let moveMode = false;
let editMode = false;

let selectedMarker = null;
let markers = [];
let tempX = 0, tempY = 0;

/* ============================================================
   DRAG FIX
============================================================ */
mapContainer.addEventListener("mousedown", (e) => {
  if (waitingForPlacement || moveMode) return;

  isDragging = true;
  dragStartX = e.clientX - posX;
  dragStartY = e.clientY - posY;
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  posX = e.clientX - dragStartX;
  posY = e.clientY - dragStartY;

  updateMap();
});

window.addEventListener("mouseup", () => {
  isDragging = false;
});

/* ============================================================
   ZOOM PROPRE
============================================================ */
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();

  const oldScale = scale;
  scale += (e.deltaY < 0 ? 0.1 : -0.1);
  scale = Math.max(0.5, Math.min(4, scale));

  const mx = e.clientX - posX;
  const my = e.clientY - posY;

  posX -= (mx / oldScale) * (scale - oldScale);
  posY -= (my / oldScale) * (scale - oldScale);

  updateMap();
});

/* ============================================================
   UPDATE MAP + MUR INVISIBLE FIX
============================================================ */
function updateMap() {
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;

  const mapWidth = mapInner.offsetWidth * scale;
  const mapHeight = mapInner.offsetHeight * scale;

  const minX = Math.min(0, containerWidth - mapWidth);
  const minY = Math.min(0, containerHeight - mapHeight);

  posX = Math.max(minX, Math.min(0, posX));
  posY = Math.max(minY, Math.min(0, posY));

  mapInner.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px, ${posY}px)`;

  updateMarkerDisplay();
}

/* ============================================================
   MARKERS
============================================================ */
function updateMarkerDisplay() {
  markers.forEach(marker => {
    const x = parseFloat(marker.dataset.x);
    const y = parseFloat(marker.dataset.y);

    marker.style.left = (x * scale) + "px";
    marker.style.top = (y * scale) + "px";

    let size = 26 / scale;
    size = Math.max(18, Math.min(32, size));

    marker.style.width = size + "px";
    marker.style.height = size + "px";
  });
}

/* ============================================================
   TOOLTIP FIX (IMPORTANT)
============================================================ */
function showTooltip(marker, e) {
  tooltip.innerHTML = `
    <img src="icons/${marker.dataset.icon}">
    <div>
      <b>${marker.dataset.name}</b><br>
      ${marker.dataset.category}
    </div>
  `;
  tooltip.classList.add("show");
}

function moveTooltip(e) {
  tooltip.style.left = (e.pageX + 10) + "px";
  tooltip.style.top = (e.pageY + 10) + "px";
}

function hideTooltip() {
  tooltip.classList.remove("show");
}

/* ============================================================
   ADD MARKER
============================================================ */
function addMarker(x, y, icon, name, id, category) {

  const img = document.createElement("img");
  img.src = "icons/" + icon;
  img.className = "marker";

  img.dataset.x = x;
  img.dataset.y = y;
  img.dataset.id = id;
  img.dataset.name = name;
  img.dataset.category = category || "Inconnu";
  img.dataset.icon = icon;

  /* TOOLTIP */
  img.addEventListener("mouseenter", (e) => showTooltip(img, e));
  img.addEventListener("mousemove", moveTooltip);
  img.addEventListener("mouseleave", hideTooltip);

  /* CLICK DROIT */
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();

    selectedMarker = img;

    markerMenu.style.left = e.pageX + "px";
    markerMenu.style.top = e.pageY + "px";
    markerMenu.style.display = "flex";
  });

  markerLayer.appendChild(img);
  markers.push(img);

  updateMarkerDisplay();
  buildFilterMenu();
}

/* ============================================================
   CLICK MAP
============================================================ */
mapContainer.addEventListener("click", async (e) => {

  if (isDragging) return;

  if (moveMode && selectedMarker) {
    const rect = mapContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - posX) / scale;
    const y = (e.clientY - rect.top - posY) / scale;

    selectedMarker.dataset.x = x;
    selectedMarker.dataset.y = y;

    await db.collection("markers").doc(selectedMarker.dataset.id).update({ x, y });

    moveMode = false;
    selectedMarker = null;
    updateMarkerDisplay();
    return;
  }

  if (!waitingForPlacement) return;

  const rect = mapContainer.getBoundingClientRect();
  tempX = (e.clientX - rect.left - posX) / scale;
  tempY = (e.clientY - rect.top - posY) / scale;

  waitingForPlacement = false;
  step1.classList.add("hidden");
  pointMenu.classList.remove("hidden");
});

/* ============================================================
   SAVE POINT FIX
============================================================ */
document.getElementById("validate-point").onclick = async () => {

  if (!pointName.value || !pointIcon.value) return;

  if (editMode && selectedMarker) {

    selectedMarker.dataset.name = pointName.value;
    selectedMarker.dataset.category = pointCategory.value;
    selectedMarker.src = "icons/" + pointIcon.value;

    await db.collection("markers").doc(selectedMarker.dataset.id).update({
      name: pointName.value,
      icon: pointIcon.value,
      category: pointCategory.value
    });

    editMode = false;
    selectedMarker = null;
    pointMenu.classList.add("hidden");
    return;
  }

  const doc = await db.collection("markers").add({
    x: tempX,
    y: tempY,
    icon: pointIcon.value,
    name: pointName.value,
    category: pointCategory.value
  });

  addMarker(tempX, tempY, pointIcon.value, pointName.value, doc.id, pointCategory.value);

  pointMenu.classList.add("hidden");
};

/* ============================================================
   CANCEL FIX
============================================================ */
document.getElementById("cancel-point").onclick = () => {
  pointMenu.classList.add("hidden");
  step1.classList.add("hidden");

  waitingForPlacement = false;
  editMode = false;
  moveMode = false;
  selectedMarker = null;
};

/* ============================================================
   MENU ACTIONS FIX
============================================================ */
editBtn.onclick = () => {
  if (!selectedMarker) return;

  editMode = true;

  pointName.value = selectedMarker.dataset.name;
  pointIcon.value = selectedMarker.dataset.icon;
  pointCategory.value = selectedMarker.dataset.category;

  pointMenu.classList.remove("hidden");
  markerMenu.style.display = "none";
};

moveBtn.onclick = () => {
  moveMode = true;
  markerMenu.style.display = "none";
};

deleteBtn.onclick = async () => {
  if (!selectedMarker) return;

  await db.collection("markers").doc(selectedMarker.dataset.id).delete();

  selectedMarker.remove();
  markers = markers.filter(m => m !== selectedMarker);

  selectedMarker = null;
  markerMenu.style.display = "none";
};

/* ============================================================
   CLOSE MENU FIX
============================================================ */
document.addEventListener("click", (e) => {
  if (!markerMenu.contains(e.target) && !e.target.classList.contains("marker")) {
    markerMenu.style.display = "none";
  }
});

/* ============================================================
   FIRESTORE REALTIME
============================================================ */
db.collection("markers").onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {

    const d = change.doc.data();

    if (change.type === "added") {
      addMarker(d.x, d.y, d.icon, d.name, change.doc.id, d.category);
    }

    if (change.type === "modified") {
      const m = markers.find(x => x.dataset.id === change.doc.id);
      if (m) {
        m.dataset.x = d.x;
        m.dataset.y = d.y;
        m.dataset.name = d.name;
        m.dataset.category = d.category;
        m.src = "icons/" + d.icon;
        updateMarkerDisplay();
      }
    }

    if (change.type === "removed") {
      const m = markers.find(x => x.dataset.id === change.doc.id);
      if (m) m.remove();
    }

  });

  buildFilterMenu();
});

