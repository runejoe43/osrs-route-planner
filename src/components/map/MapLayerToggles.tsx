import { Paper, Radio, SimpleGrid, Text } from "@mantine/core";
import {
  useMapVisibilityActions,
  useShowMapIcons,
  useShowMapLabels,
} from "../../stores/mapVisibilityStore";

export default function MapLayerToggles() {
  const showMapLabels = useShowMapLabels();
  const showMapIcons = useShowMapIcons();
  const { setShowMapIcons, setShowMapLabels } = useMapVisibilityActions();

  return (
    <Paper
      shadow="md"
      radius="md"
      p="sm"
      className="map-layer-toggles"
      withBorder
    >
      <SimpleGrid cols={3} spacing={4} verticalSpacing={4}>
        <Text size="sm" fw={600}>
          Map Labels
        </Text>
        <Radio
          value="on"
          label="Show"
          checked={showMapLabels}
          onChange={() => setShowMapLabels(true)}
        />
        <Radio
          value="off"
          label="Hide"
          checked={!showMapLabels}
          onChange={() => setShowMapLabels(false)}
        />

        <Text size="sm" fw={600}>
          Map Icons
        </Text>
        <Radio
          value="on"
          label="Show"
          checked={showMapIcons}
          onChange={() => setShowMapIcons(true)}
        />
        <Radio
          value="off"
          label="Hide"
          checked={!showMapIcons}
          onChange={() => setShowMapIcons(false)}
        />
      </SimpleGrid>
    </Paper>
  );
}
