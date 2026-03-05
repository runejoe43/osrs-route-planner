import { Box } from "@mantine/core";
import "leaflet/dist/leaflet.css";
import "../../style/Map.css";
import { MapContainer, TileLayer } from "react-leaflet";
import L, { LatLngBounds } from "leaflet";
import WorldMapLabels from "./WorldMapLabels";
import WorldMapIcons from "./WorldMapIcons";
import QuestPins from "./QuestPins";
import CoordViewer from "./CoordViewer";
import MapAutoPan from "./MapAutoPan";

export default function OSRSMap() {
  const bounds = new LatLngBounds([0, 0], [-1428, 405]);
  const center: [number, number] = [-1173, 273];

  return (
    <Box h="100%" w="100%" style={{ minHeight: 400, position: "relative" }}>
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

        <WorldMapIcons />
        <QuestPins />
        <WorldMapLabels />

        <CoordViewer />
        <MapAutoPan />
      </MapContainer>
    </Box>
  );
}