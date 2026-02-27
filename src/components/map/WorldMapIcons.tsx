import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { loadMapIcons, type MapIconEntry } from '../../lib/worldMapData';

const DEFAULT_ICON_SIZE = 16;

function getIconSizeForZoom(zoom: number): number {
  switch (zoom) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    default:
      return DEFAULT_ICON_SIZE;
  }
}

function createIcon(iconPath: string, size: number): L.Icon {
  const anchor = size / 2;
  return L.icon({
    iconUrl: iconPath,
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    className: 'worldmap-icon-marker',
  });
}

export default function WorldMapIcons() {
  const [icons, setIcons] = useState<MapIconEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(3);
  const map = useMap();

  useEffect(() => {
    async function loadIcons() {
      try {
        const data = await loadMapIcons();
        setIcons(data);
      } catch (error) {
        console.error('Failed to load map icons:', error);
      } finally {
        setLoading(false);
      }
    }
    loadIcons();
  }, []);

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    setZoom(map.getZoom());
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  if (loading) return null;

  const iconSize = getIconSizeForZoom(zoom);

  return (
    <>
      {icons.map((icon, index) => (
        <Marker
          key={`icon-${index}-${icon.lat}-${icon.lng}-${icon.label}`}
          position={[icon.lat, icon.lng]}
          icon={createIcon(icon.iconPath, iconSize)}
        />
      ))}
    </>
  );
}
