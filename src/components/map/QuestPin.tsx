import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { IconCircleFilled } from "@tabler/icons-react";
import { useActiveCoordinates, useQuestActions } from "../../stores/questStore";
import { worldPointToLeaflet } from "../../util/Coordinates";
import { Button } from "@mantine/core";

const questPinIcon = L.divIcon({
  html: renderToStaticMarkup(<IconCircleFilled size={24} color="#228be6" />),
  className: "quest-pin-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function QuestPin({ id }: { id: string }) {
  const coords = useActiveCoordinates(id);
  const { advanceStep } = useQuestActions();
  if (!coords) return null
  return (
    <Marker key={`marker-${id}`} position={worldPointToLeaflet(coords)} icon={questPinIcon} zIndexOffset={1000}>
      <Popup>
        {id}
        <Button onClick={() => advanceStep(id)}>Advance Step</Button>
      </Popup>
    </Marker>
  );
}