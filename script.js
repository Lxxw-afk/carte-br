const mapImg = document.getElementById("map");

let zoom = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX, startY;

mapImg.style.transformOrigin = "0 0";

document.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoom += e.deltaY * -0.001;
    zoom = Math.min(Math.max(zoom, 0.5), 3);
    updateTransform();
});

mapImg.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX - posX;
    startY = e.clientY - posY;
    mapImg.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    posX = e.clientX - startX;
    posY = e.clientY - startY;
    updateTransform();
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    mapImg.style.cursor = "grab";
});

function updateTransform() {
    mapImg.style.transform =
        `translate(${posX}px, ${posY}px) scale(${zoom})`;
}

