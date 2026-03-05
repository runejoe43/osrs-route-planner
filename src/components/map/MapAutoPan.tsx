import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { useSelectedQuestId, useActiveStep } from "../../stores/questStore";
import { worldPointToLeaflet } from "../../util/Coordinates";

function ActiveStepPanner({ questId }: { questId: string }) {
  const map = useMap();
  const step = useActiveStep(questId);
  const prevWorldpointRef = useRef<string | null>(null);

  useEffect(() => {
    if (!step?.worldpoint) return;
    const key = `${step.worldpoint.x},${step.worldpoint.y},${step.worldpoint.plane}`;
    if (key === prevWorldpointRef.current) return;
    prevWorldpointRef.current = key;
    const { lat, lng } = worldPointToLeaflet(step.worldpoint);
    map.panTo([lat, lng], { animate: true });
  }, [map, step?.worldpoint]);

  return null;
}

export default function MapAutoPan() {
  const selectedQuestId = useSelectedQuestId();
  if (!selectedQuestId) return null;
  return <ActiveStepPanner questId={selectedQuestId} />;
}
