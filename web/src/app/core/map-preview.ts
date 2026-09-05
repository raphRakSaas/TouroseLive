/** Aperçu carto pour stations / parkings (pas de photo dans le feed GBFS).
 *  Carto basemaps exigent une clé → Esri World Street Map (tuiles publiques).
 */
export function mapPreviewUrl(
  latitude: number,
  longitude: number,
  zoom = 16,
): string {
  const tileZoom = Math.min(18, Math.max(1, Math.round(zoom)));
  const worldSize = 2 ** tileZoom;
  const tileX = Math.floor(((longitude + 180) / 360) * worldSize);
  const latitudeRadians = (latitude * Math.PI) / 180;
  const tileY = Math.floor(
    ((1 -
      Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) /
        Math.PI) /
      2) *
      worldSize,
  );
  const safeX = ((tileX % worldSize) + worldSize) % worldSize;
  const safeY = Math.min(worldSize - 1, Math.max(0, tileY));
  // ArcGIS tile path is z/y/x (not z/x/y).
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${tileZoom}/${safeY}/${safeX}`;
}
