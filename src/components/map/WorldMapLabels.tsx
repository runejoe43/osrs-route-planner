import { useEffect, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { loadWorldMapLabels, labelsToMarkers, type MapMarker } from '../../lib/worldMapData';

function createLabelIcon(name: string, textScale: number, zoom: number): L.DivIcon {
  let fontSize: number;
  let color: string;

  if (zoom <= 2 && textScale === 2) {
    fontSize = 20;
    color = '#FFD700';
  } else {
    fontSize = textScale === 0 ? 18 : 19;
    color = 'white';
  }

  const hasLineBreaks = name.includes('<br>');
  const lines = hasLineBreaks ? name.split('<br>') : [name];
  const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
  const estimatedWidth = longestLine.length * fontSize * 0.6;
  const estimatedHeight = lines.length * fontSize * 1.3;

  return L.divIcon({
    className: 'worldmap-label',
    html: `<div style="
      font-family: 'RuneScape', sans-serif;
      font-size: ${fontSize}px;
      font-weight: bold;
      color: ${color};
      text-align: center;
      text-shadow: 1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black;
      white-space: ${hasLineBreaks ? 'normal' : 'nowrap'};
      pointer-events: none;
      user-select: none;
      line-height: 1.2;
    ">${name}</div>`,
    iconSize: [estimatedWidth, estimatedHeight],
    iconAnchor: [estimatedWidth / 2, estimatedHeight / 2],
  });
}

export default function WorldMapLabels() {
  const [labels, setLabels] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(3);
  const map = useMap();

  useEffect(() => {
    async function loadLabels() {
      try {
        const data = await loadWorldMapLabels();
        setLabels(labelsToMarkers(data));
      } catch (error) {
        console.error('Failed to load worldmap labels:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLabels();
  }, []);

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    setZoom(map.getZoom());
    return () => {
      console.log('Unmounting WorldMapLabels, zoom:', zoom);
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  if (loading) return null;

  /**
   * Filter labels based on zoom level and text scale.
   * Text Scale 0 is for zoom 1-2
   *            1 is for zoom 3-4
   *            2 is for zoom 5-6
   */
  const visibleLabels = labels.filter((label) => {
    if (label.sailing) {
      return false;
    }
    switch (zoom) {
      case 1:
      case 2:
        return label.textScale === 2;
      case 3:
        return label.textScale === 1;
      case 4:
      default:
        return label.textScale === 1 || label.textScale === 0;
    }
  });

  return (
    <>
      {visibleLabels.map((label) => (
        <Marker
          key={label.id}
          position={[label.lat, label.lng]}
          icon={createLabelIcon(label.name, label.textScale ?? 1, zoom)}
        />
      ))}
    </>
  );
}
