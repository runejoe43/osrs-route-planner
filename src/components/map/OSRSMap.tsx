import { Box } from "@mantine/core";
import "leaflet/dist/leaflet.css";
import "../../style/Map.css";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { leafletToWorldPoint } from "../../util/Coordinates";
import { useState, useEffect } from "react";
import L, { LatLngBounds } from "leaflet";
import type { MapPin } from "../../types/MapPin";
import { loadQuestMarkers } from "../../util/loadQuestMarkers";
import WorldMapLabels from "./WorldMapLabels";
import WorldMapIcons from "./WorldMapIcons";

export default function OSRSMap() {
  const bounds = new LatLngBounds([0, 0], [-1428, 405]);
  const center: [number, number] = [-1173, 273];

  const [markers, setMarkers] = useState<MapPin[]>([]);

  useEffect(() => {
    loadQuestMarkers().then(setMarkers);
  }, []);

  const LocationFinder = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        const world = leafletToWorldPoint(lat, lng, 0);
        console.log("Map click:", { leaflet: { lat, lng }, worldPoint: world });
        setMarkers([...markers, { worldPoint: world, leafletLatLng: e.latlng }]);
      },
    });
    return null;
  };

  return (
    <Box h="100%" w="100%" style={{ minHeight: 400 }}>
      <MapContainer
        crs={L.CRS.Simple}
        bounds={bounds}
        center={center}
        zoom={4}
        minZoom={1}
        maxZoom={6}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', minHeight: 400 }}
        className="map-container"
        zoomControl={false}
        attributionControl={false}
      >
        <LocationFinder />

        {markers.map((pin, idx) => 
          <Marker key={`marker-${idx}`} position={pin.leafletLatLng}>
          <Popup>
            {pin.description ? <span>{pin.description}</span> : <span>No description</span>}
          </Popup>
        </Marker>
        )}

        <TileLayer
          key="plane-0"
          url="https://joegandy.github.io/RSMap/tiles/0/{z}/{x}/{y}.png"
          tileSize={256}
          noWrap={true}
          tms={true}
          opacity={1}
          attribution="OSRS Map Data"
          crossOrigin="anonymous"
        />

        <WorldMapLabels />
        <WorldMapIcons />
      </MapContainer>
    </Box>
  );
}