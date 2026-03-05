import { Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { IconMapPinFilled } from "@tabler/icons-react";
import { useActiveStep, useQuestActions } from "../../stores/questStore";
import { worldPointToLeaflet } from "../../util/Coordinates";

const questPinIcon = L.divIcon({
  html: renderToStaticMarkup(<IconMapPinFilled size={24} color="#228be6" />),
  className: "quest-pin-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function QuestPin({ id }: { id: string }) {
  const step = useActiveStep(id);
  const { selectQuest } = useQuestActions();

  if (!step) return null;

  return (
    <Marker
      key={`marker-${id}`}
      position={worldPointToLeaflet(step.worldpoint!)}
      icon={questPinIcon}
      zIndexOffset={1000}
      eventHandlers={{ click: () => selectQuest(id) }}
    >
      <Tooltip content={id} />
    </Marker>
  );
}