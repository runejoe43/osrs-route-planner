import { Paper, Radio, Stack, Text } from "@mantine/core";
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
      <Stack gap="sm">
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Map Labels
          </Text>
          <Radio.Group
            value={showMapLabels ? "on" : "off"}
            onChange={(value) => setShowMapLabels(value === "on")}
          >
            <Stack gap={4}>
              <Radio value="on" label="Show" />
              <Radio value="off" label="Hide" />
            </Stack>
          </Radio.Group>
        </Stack>

        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Map Icons
          </Text>
          <Radio.Group
            value={showMapIcons ? "on" : "off"}
            onChange={(value) => setShowMapIcons(value === "on")}
          >
            <Stack gap={4}>
              <Radio value="on" label="Show" />
              <Radio value="off" label="Hide" />
            </Stack>
          </Radio.Group>
        </Stack>
      </Stack>
    </Paper>
  );
}
