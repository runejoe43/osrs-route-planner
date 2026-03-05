import { useState } from "react";
import { ActionIcon, Button, Collapse, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useSelectedQuest, useQuestActions } from "../../stores/questStore";
import { useRouteActions } from "../../stores/routeStore";
import DraggableBox from "./draggableBox";

export default function QuestViewer() {
  const quest = useSelectedQuest();
  const { setActiveStep, selectQuest } = useQuestActions();
  const { appendRoute } = useRouteActions();
  const [collapsedPanels, setCollapsedPanels] = useState<Set<number>>(new Set());

  if (!quest) return null;

  const activeStep = quest.activeStep ?? 0;

  const panelStartIndices = quest.steps.reduce<number[]>((acc, _, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + quest.steps[idx - 1].steps.length);
    return acc;
  }, []);

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
    handleAddPanel: (e: React.MouseEvent) => void
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
        onClick={handleAddPanel}
      >
        Add All
      </Button>
      <ActionIcon variant="subtle" size="xs" aria-label={isCollapsed ? "Expand" : "Collapse"}>
        {isCollapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
      </ActionIcon>
    </Group>
  );

  const renderStepRow = (flatIndex: number) => {
    const flatStep = quest.flatSteps[flatIndex];
    if (!flatStep) return null;
    const isPast = flatIndex < activeStep;

    const handleAddStep = () => {
      for (let i = activeStep; i <= flatIndex; i++) {
        const step = quest.flatSteps[i];
        if (step) appendRoute(step);
      }
      setActiveStep(quest.name, Math.min(flatIndex + 1, quest.flatSteps.length - 1));
    };

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
        <Button size="xs" variant="light" disabled={isPast} style={{ flexShrink: 0 }} onClick={handleAddStep}>
          Add
        </Button>
      </Group>
    );
  };

  const renderPanel = (panel: (typeof quest.steps)[number], panelIdx: number) => {
    const panelStartIndex = panelStartIndices[panelIdx];
    const panelEndIndex = panelStartIndex + panel.steps.length - 1;
    const isCollapsed = collapsedPanels.has(panelIdx);
    const panelFullyAdded = activeStep > panelEndIndex;
    const firstStepToAdd = Math.max(activeStep, panelStartIndex);

    const handleAddPanel = (e: React.MouseEvent) => {
      e.stopPropagation();
      for (let i = firstStepToAdd; i <= panelEndIndex; i++) {
        const step = quest.flatSteps[i];
        if (step) appendRoute(step);
      }
      setActiveStep(quest.name, Math.min(panelEndIndex + 1, quest.flatSteps.length - 1));
    };

    return (
      <Stack key={panelIdx} gap={4}>
        {renderPanelHeader(panel.panelName, panelIdx, isCollapsed, panelFullyAdded, handleAddPanel)}
        <Collapse in={!isCollapsed}>
          <Stack gap={4}>
            {panel.steps.map((_, stepIdx) => renderStepRow(panelStartIndex + stepIdx))}
          </Stack>
        </Collapse>
      </Stack>
    );
  };

  return (
    <DraggableBox title={quest.name} initialPosition={{ x: window.innerWidth - 320 - 12, y: 12 }} onClose={() => selectQuest(null)}>
      <ScrollArea.Autosize mah={1000} offsetScrollbars>
        <Stack gap="xs">
          {quest.steps.map((panel, panelIdx) => renderPanel(panel, panelIdx))}
        </Stack>
      </ScrollArea.Autosize>
    </DraggableBox>
  );
}
