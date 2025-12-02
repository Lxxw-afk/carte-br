const map = document.getElementById("map");

let isDragging = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;

// on empêche le drag natif de l'image
map.draggable = false;

// quand on appuie sur le clic gauche
map.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return; // seulement clic gauche
  isDragging = true;
  map.style.cursor = "grabbing";
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

// quand on bouge la souris
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;

  map.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
});

// quand on relâche le clic
document.addEventListener("mouseup", () => {
  isDragging = false;
  map.style.cursor = "grab";
});

// optionnel : empêcher la molette de zoomer la page (si tu veux)
document.addEventListener("wheel", (e) => {
  e.preventDefault();
}, { passive: false });


