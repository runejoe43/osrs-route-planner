/**
 * Coordinate conversion between Leaflet (lat/lng) and OSRS WorldPoint.
 * WorldPoint matches RuneLite / Quest Helper: x (east), y (north), plane.
 * Uses five-point least-squares calibration (Lumbridge, Varrock, Ardougne, Wintertodt, Weiss Salt Mine)
 * for the RSMap tile layout (bounds [0,0] to [-1428, 405]); scale is not 1:1.
 */

export interface WorldPoint {
  x: number;
  y: number;
  plane: number;
}

export interface LeafletCoords {
  lat: number;
  lng: number;
}

/** Leaflet bounds for the RSMap tile layer: lng [0, 405], lat [0, -1428]. */
const LEAFLET_LNG_MIN = 0;
const LEAFLET_LNG_MAX = 405;
const LEAFLET_LAT_MIN = -1428;
const LEAFLET_LAT_MAX = 0;

/**
 * Five-point calibration: Leaflet (lat, lng) + expected WorldPoint (x, y) for each POI.
 * scale_x, offset_x, scale_y, offset_y are derived via least-squares at module load.
 */
const CAL_POINTS: Array<{ leaflet: LeafletCoords; world: WorldPoint }> = [
  { leaflet: { lat: -1174.2476, lng: 280.9303 }, world: { x: 3206, y: 3214, plane: 0 } },
  { leaflet: { lat: -1147.421875, lng: 281.625 }, world: { x: 3212, y: 3428, plane: 0 } },
  { leaflet: { lat: -1162.78125, lng: 212.625 }, world: { x: 2661, y: 3305, plane: 0 } },
  { leaflet: { lat: -1080.375, lng: 83.8125 }, world: { x: 1630, y: 3965, plane: 0 } },
  { leaflet: { lat: -283.65625, lng: 236.46875 }, world: { x: 2851, y: 10338, plane: 0 } },
];

/** Least-squares fit: world_axis = scale * leaflet_axis + offset. Returns [scale, offset]. */
function linearFit(
  leafletValues: number[],
  worldValues: number[]
): [number, number] {
  const n = leafletValues.length;
  let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
  for (let i = 0; i < n; i++) {
    const x = leafletValues[i];
    const y = worldValues[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }
  const denom = n * sumXX - sumX * sumX;
  const scale = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const offset = (sumY - scale * sumX) / n;
  return [scale, offset];
}

const [scale_x, offset_x] = linearFit(
  CAL_POINTS.map((p) => p.leaflet.lng),
  CAL_POINTS.map((p) => p.world.x)
);
const [scale_y, offset_y] = linearFit(
  CAL_POINTS.map((p) => p.leaflet.lat),
  CAL_POINTS.map((p) => p.world.y)
);

/**
 * Convert Leaflet (lat, lng) to RuneLite/Quest Helper WorldPoint.
 * Uses integer tile coordinates (round).
 */
export function leafletToWorldPoint(lat: number, lng: number, plane: number = 0): WorldPoint {
  const x = Math.round(scale_x * lng + offset_x);
  const y = Math.round(scale_y * lat + offset_y);
  return { x, y, plane };
}

/**
 * Convert WorldPoint to Leaflet (lat, lng) for placing markers / centering.
 */
export function worldPointToLeaflet(wp: WorldPoint): LeafletCoords {
  return {
    lng: (wp.x - offset_x) / scale_x,
    lat: (wp.y - offset_y) / scale_y,
  };
}

/**
 * Clamp a WorldPoint to valid OSRS tile range (optional guard).
 * Game tile coords are typically 0–~12800; map may only show a subset.
 */
export function clampWorldPoint(wp: WorldPoint): WorldPoint {
  return {
    x: Math.max(0, Math.min(16383, wp.x)),
    y: Math.max(0, Math.min(16383, wp.y)),
    plane: Math.max(0, Math.min(3, wp.plane)),
  };
}

/**
 * Check if Leaflet coords are within the map bounds.
 */
export function isWithinMapBounds(lat: number, lng: number): boolean {
  return (
    lng >= LEAFLET_LNG_MIN &&
    lng <= LEAFLET_LNG_MAX &&
    lat >= LEAFLET_LAT_MIN &&
    lat <= LEAFLET_LAT_MAX
  );
}

/** Known POIs for verification (Explv / RuneLite coordinates). */
export const KNOWN_POIS: Array<{ name: string; world: WorldPoint; note?: string }> = [
  { name: 'Lumbridge castle kitchen', world: { x: 3206, y: 3214, plane: 0 } },
  { name: 'Varrock courtyard', world: { x: 3212, y: 3428, plane: 0 } },
  { name: 'Ardougne market center', world: { x: 2661, y: 3305, plane: 0 } },
  { name: 'Wintertodt door', world: { x: 1630, y: 3965, plane: 0 }, note: 'North of map bounds (lat < -1428)' },
  { name: 'Weiss Salt Mine', world: { x: 2851, y: 10338, plane: 0 }, note: 'Far north of map' },
];
