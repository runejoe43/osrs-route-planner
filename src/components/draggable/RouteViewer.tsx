import { ActionIcon, Button, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconTrashFilled } from "@tabler/icons-react";
import { useRoute, useRouteActions } from "../../stores/routeStore";
import { useQuestActions } from "../../stores/questStore";
import { useDeleteStep } from "../../hooks/useDeleteStep";
import DraggableBox from "./draggableBox";

export default function RouteViewer() {
  const route = useRoute();
  const { reset: resetRoute } = useRouteActions();
  const { reset: resetQuests } = useQuestActions();
  const deleteStep = useDeleteStep();

  const handleReset = () => {
    resetRoute();
    resetQuests();
  };

  return (
    <DraggableBox title="Route" info="View and modify your Route." initialPosition={{ x: 12, y: 100 }}>
      <Stack gap="xs">
        <Button variant="light" color="red" size="xs" onClick={handleReset}>
          Reset
        </Button>
        <ScrollArea.Autosize mah={1000} offsetScrollbars>
          {route.length === 0 ? (
            <Text size="sm" c="dimmed">No steps added yet.</Text>
          ) : (
            <Stack gap="xs">
              {route.map((step) => (
                <Group key={`${step.id}-${step.description}`} className="route-step" wrap="nowrap" align="center" gap="xs" px={4} py={2}>
                  <Text size="sm" style={{ flex: 1 }}>{step.description}</Text>
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => deleteStep(step.id)} aria-label="Delete step">
                    <IconTrashFilled size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}
        </ScrollArea.Autosize>
      </Stack>
    </DraggableBox>
  );
}
