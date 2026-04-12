document.addEventListener("DOMContentLoaded", () => {

const mapContainer = document.getElementById("map-container");
const mapInner = document.getElementById("map-inner");
const markerLayer = document.getElementById("marker-layer");

const loginScreen = document.getElementById("login-screen");
const app = document.getElementById("app");

const tooltip = document.getElementById("tooltip");

const toggleFilterBtn = document.getElementById("toggle-filter");
const filterPanel = document.getElementById("filter-panel");

const pointMenu = document.getElementById("point-menu");
const pointName = document.getElementById("point-name");
const pointIcon = document.getElementById("point-icon");
const pointCategory = document.getElementById("point-category");

let posX = 0, posY = 0;
let scale = 1;

let markers = [];
let activeCategories = new Set();

/* ================= LOGIN FIX ================= */
document.getElementById("login-btn").addEventListener("click", () => {
  const value = document.getElementById("access-code").value;

  if (value === "BRIGADE2026") {
    loginScreen.style.display = "none";
    app.classList.remove("hidden");
  } else {
    document.getElementById("login-error").textContent = "Code incorrect";
  }
});

/* ================= MAP ================= */
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  const old = scale;
  scale += e.deltaY < 0 ? 0.1 : -0.1;
  scale = Math.max(0.5, Math.min(4, scale));

  const mx = e.clientX - posX;
  const my = e.clientY - posY;

  posX -= (mx / old) * (scale - old);
  posY -= (my / old) * (scale - old);

  update();
});

function update() {
  mapInner.style.transform = `translate(${posX}px,${posY}px) scale(${scale})`;
  markerLayer.style.transform = `translate(${posX}px,${posY}px)`;

  markers.forEach(m => {
    m.style.left = (m.dataset.x * scale) + "px";
    m.style.top = (m.dataset.y * scale) + "px";
  });
}

/* ================= MARKERS ================= */
function addMarker(x, y, icon, name, cat) {

  const el = document.createElement("img");
  el.src = "icons/" + icon;
  el.className = "marker";

  el.dataset.x = x;
  el.dataset.y = y;
  el.dataset.category = cat;

  el.addEventListener("mouseenter", () => {
    tooltip.style.display = "block";
    tooltip.innerHTML = name + "<br>" + cat;
  });

  el.addEventListener("mousemove", (e) => {
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  });

  el.addEventListener("mouseleave", () => {
    tooltip.style.display = "none";
  });

  markerLayer.appendChild(el);
  markers.push(el);
}

/* ================= FILTER MENU ================= */
toggleFilterBtn.addEventListener("click", () => {
  filterPanel.classList.toggle("hidden");
});

});
