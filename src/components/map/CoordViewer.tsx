import { Group, Paper, Text } from "@mantine/core";
import { useCoords, useCoordsStoreActions } from "../../stores/coordStore";
import { useMapEvents } from "react-leaflet";


export default function CoordViewer() {

  const coords = useCoords();

  const { setCoords } = useCoordsStoreActions();
  
    useMapEvents({
      mousemove(e) {
        setCoords(e.latlng)
      }
    })
  
  return (
    <Paper
      shadow="md"
      radius="md"
      p="sm"
      className="coord-viewer"
      withBorder
    >
      <Group>
        <Text>X: {coords.x}</Text>
        <Text>Y: {coords.y}</Text>
        <Text>Plane: {coords.plane}</Text>
      </Group>
    </Paper>
  );
}