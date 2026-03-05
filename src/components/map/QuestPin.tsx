import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { IconMapPinFilled } from "@tabler/icons-react";
import { useActiveStep, useQuestActions } from "../../stores/questStore";
import { useRouteActions } from "../../stores/routeStore";
import { worldPointToLeaflet } from "../../util/Coordinates";
import { Button, Stack, Text } from "@mantine/core";

const questPinIcon = L.divIcon({
  html: renderToStaticMarkup(<IconMapPinFilled size={24} color="#228be6" />),
  className: "quest-pin-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function QuestPin({ id }: { id: string }) {
  const step = useActiveStep(id);
  const { advanceStep } = useQuestActions();
  const { appendRoute } = useRouteActions();

  if (!step) return null
  
  return (
    <Marker key={`marker-${id}`} position={worldPointToLeaflet(step.worldpoint!)} icon={questPinIcon} zIndexOffset={1000}>
      <Tooltip content={id} />
      <Popup>
        <Stack>
          <Text>{step.description}</Text>
          <Button onClick={() => { appendRoute(step); advanceStep(id); }}>Advance Step</Button>
        </Stack>
      </Popup>
    </Marker>    
  );
}