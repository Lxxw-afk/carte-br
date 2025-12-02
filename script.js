const container = document.getElementById("map-container");

let isDragging = false;
let startX, startY;
let scrollLeft = 0, scrollTop = 0;

container.addEventListener("mousedown", (e) => {
    isDragging = true;
    container.style.cursor = "grabbing";

    startX = e.clientX + scrollLeft;
    startY = e.clientY + scrollTop;
});

container.addEventListener("mouseup", () => {
    isDragging = false;
    container.style.cursor = "grab";
});

container.addEventListener("mouseleave", () => {
    isDragging = false;
    container.style.cursor = "grab";
});

container.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    scrollLeft = startX - e.clientX;
    scrollTop = startY - e.clientY;

    container.scrollTo(scrollLeft, scrollTop);
});



