/**
 * World Map Data Loader
 * Loads and processes worldmap data extracted from OSRS cache.
 * Uses project Coordinates.worldPointToLeaflet for OSRS world → Leaflet conversion.
 */

import { worldPointToLeaflet, type WorldPoint } from '../util/Coordinates';

export interface WorldMapLabel {
  name: string;
  worldPoint: WorldPoint;
  sailing?: boolean;
}

/** Label with scale applied at load time (from which file it was loaded). */
export type LoadedWorldMapLabel = WorldMapLabel & { textScale: number };

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  textScale: number;
  plane?: number;
  sailing?: boolean;
}

/**
 * Load world map labels from the three scale-based JSON files and merge with textScale set by file.
 */
export async function loadWorldMapLabels(): Promise<LoadedWorldMapLabel[]> {
  const scaleUrls: Array<{ scale: number; url: string }> = [
    { scale: 0, url: '/worldmap/worldmap_labels_0.json' },
    { scale: 1, url: '/worldmap/worldmap_labels_1.json' },
    { scale: 2, url: '/worldmap/worldmap_labels_2.json' },
  ];
  const results = await Promise.all(
    scaleUrls.map(async ({ scale, url }) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}: ${response.statusText}`);
      const labels: WorldMapLabel[] = await response.json();
      return labels.map((label) => ({ ...label, textScale: scale }));
    })
  );
  return results.flat();
}

/**
 * Convert world map labels to map markers using project coordinate conversion.
 */
export function labelsToMarkers(labels: LoadedWorldMapLabel[]): MapMarker[] {
  return labels.map((label, index) => {
    const coords = worldPointToLeaflet(label.worldPoint);

    return {
      id: `label-${index}`,
      name: label.name,
      lat: coords.lat,
      lng: coords.lng,
      type: 'label',
      textScale: label.textScale,
      sailing: label.sailing,
    };
  });
}

/** Single icon entry from icons.json (coordinates + icon path + label). */
export interface MapIconEntry {
  lat: number;
  lng: number;
  iconPath: string;
  label: string;
}

/**
 * Load map icons from public/icons/icons.json.
 * Coordinates are in the same Leaflet CRS as the world map.
 */
export async function loadMapIcons(): Promise<MapIconEntry[]> {
  const response = await fetch('/icons/icons.json');
  if (!response.ok) throw new Error(`Failed to load icons: ${response.statusText}`);
  return response.json();
}
