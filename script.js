const mapContainer = document.getElementById("map-container");
const mapInner     = document.getElementById("map-inner");
const mapImg       = document.getElementById("map");

let offsetX = 0, offsetY = 0;
let isDragging = false;
let startX = 0, startY = 0;

function update() {
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

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
  update();
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  mapContainer.style.cursor = "grab";
});

// zoom molette
let zoom = 1;
mapContainer.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  zoom = Math.max(0.4, Math.min(3, zoom + delta));
  mapInner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}, { passive: false });









