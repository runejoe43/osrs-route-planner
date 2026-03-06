import { useState } from "react";
import { ActionIcon, Button, Center, Collapse, Divider, Group, ScrollArea, Stack, Switch, Text, Tooltip } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useQuestViewer } from "../../hooks/useQuestViewer";
import DraggableBox from "./draggableBox";

export default function QuestViewer() {
  const { quest, panelStartIndices, parallelPanels, setParallelPanels, hasStepsInRoute, isPanelFullyAdded, isStepPast, handleAddStep, handleAddPanel, closeViewer } = useQuestViewer();
  const [collapsedPanels, setCollapsedPanels] = useState<Set<number>>(new Set());

  if (!quest) return null;

  const togglePanel = (index: number) => {
    setCollapsedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const renderPanelHeader = (
    panelName: string,
    panelIdx: number,
    isCollapsed: boolean,
    panelFullyAdded: boolean,
    onAddPanel: (e: React.MouseEvent) => void
  ) => (
    <Group
      wrap="nowrap"
      align="center"
      gap="xs"
      style={{ cursor: "pointer" }}
      onClick={() => togglePanel(panelIdx)}
    >
      <Text size="sm" fw={500} style={{ flex: 1 }}>
        {panelName}
      </Text>
      <Button
        size="xs"
        variant="light"
        disabled={panelFullyAdded}
        style={{ flexShrink: 0 }}
        onClick={onAddPanel}
      >
        Add All
      </Button>
      <ActionIcon variant="subtle" size="xs" aria-label={isCollapsed ? "Expand" : "Collapse"}>
        {isCollapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
      </ActionIcon>
    </Group>
  );

  const renderStepRow = (flatIndex: number, panelStartIndex: number) => {
    const flatStep = quest.flatSteps[flatIndex];
    if (!flatStep) return null;

    const isPast = isStepPast(flatIndex, panelStartIndex);

    return (
      <Group
        key={flatStep.id}
        wrap="nowrap"
        align="center"
        gap="xs"
        px={4}
        py={2}
        style={{ borderRadius: "var(--mantine-radius-sm)" }}
      >
        <Text size="sm" w={20} ta="center" style={{ flexShrink: 0 }}>
          {flatIndex + 1}
        </Text>
        <Text size="sm" style={{ flex: 1 }}>
          {flatStep.description}
        </Text>
        <Button
          size="xs"
          variant="light"
          disabled={isPast}
          style={{ flexShrink: 0 }}
          onClick={() => handleAddStep(flatIndex, panelStartIndex)}
        >
          Add
        </Button>
      </Group>
    );
  };

  const renderPanel = (panel: (typeof quest.steps)[number], panelIdx: number) => {
    const panelStartIndex = panelStartIndices[panelIdx];
    const panelEndIndex = panelStartIndex + panel.steps.length - 1;
    const isCollapsed = collapsedPanels.has(panelIdx);
    const panelFullyAdded = isPanelFullyAdded(panelStartIndex, panelEndIndex);

    const onAddPanel = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleAddPanel(panelStartIndex, panelEndIndex);
    };

    return (
      <Stack key={panelIdx} gap={4}>
        {renderPanelHeader(panel.panelName, panelIdx, isCollapsed, panelFullyAdded, onAddPanel)}
        <Collapse in={!isCollapsed}>
          <Stack gap={4}>
            {panel.steps.map((_, stepIdx) => renderStepRow(panelStartIndex + stepIdx, panelStartIndex))}
          </Stack>
        </Collapse>
        <Divider />
      </Stack>
    );
  };

  return (
    <DraggableBox
      title={quest.name}
      info={"Add steps from the selected quest to your Route.\nSteps can be added in order from a group, and groups can be done out of order (even if you cant in game, this is to allow quests like Dragon Slayer 1 to do the map pieces in any order or even in parallel)"}
      initialPosition={{ x: window.innerWidth - 320 - 12, y: 12 }}
      onClose={closeViewer}
    >
      <Center>
        <Tooltip
          label={
            hasStepsInRoute
              ? "Cannot change mode after steps have been added to the route."
              : "When sequential, steps must be added in order within each group. When parallel, groups can be completed in any order and steps added independently."
          }
          multiline
          w={260}
          withArrow
          position="bottom"
          zIndex={1001}
        >
          <Group gap="xs" align="center" mb="xs" wrap="nowrap">
            <Text size="xs" c={parallelPanels && !hasStepsInRoute ? undefined : "dimmed"}>Parallel steps</Text>
            <Switch
              size="xs"
              checked={!parallelPanels}
              disabled={hasStepsInRoute}
              onChange={(e) => setParallelPanels(!e.currentTarget.checked)}
            />
            <Text size="xs" c={!parallelPanels && !hasStepsInRoute ? undefined : "dimmed"}>Sequential steps</Text>
          </Group>
        </Tooltip>
      </Center>
      <ScrollArea.Autosize mah={1000} offsetScrollbars>
        <Stack gap="xs">
          <Divider />
          {quest.steps.map((panel, panelIdx) => renderPanel(panel, panelIdx))}
        </Stack>
      </ScrollArea.Autosize>
    </DraggableBox>
  );
}
