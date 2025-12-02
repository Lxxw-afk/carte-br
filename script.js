// Dimensions approximatives de ton image (en pixels)
const MAP_WIDTH = 2048;
const MAP_HEIGHT = 2048;

// On crée une carte Leaflet en "CRS.Simple" (coordonnées en pixels)
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -2,
  maxZoom: 2
});

// Limites de l'image
const bounds = [[0, 0], [MAP_HEIGHT, MAP_WIDTH]];

// On affiche ton image comme fond de carte
L.imageOverlay('images/map.png', bounds).addTo(map);

// On ajuste la vue pour voir toute la carte
map.fitBounds(bounds);

// Maintenant tu peux te déplacer avec la souris (drag)
// et zoomer avec la molette comme sur une vraie carte.


