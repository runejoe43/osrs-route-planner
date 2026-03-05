import { useState } from "react";
import { ActionIcon, Button, Collapse, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useSelectedQuest, useQuestActions } from "../../stores/questStore";
import type { StoredQuest } from "../../stores/questStore";
import { useRoute, useRouteActions } from "../../stores/routeStore";
import type { QuestStep } from "../../types/Steps";
import DraggableBox from "./draggableBox";

/**
 * When true all panels are treated as independent/parallel: clicking "Add" on
 * step N in a panel adds from the START of that panel to step N (skipping any
 * steps already in the route), with no cross-panel auto-filling.
 * Set to false to restore the original sequential behaviour where clicking a
 * step also catches up every skipped step from the global activeStep cursor.
 */
const PARALLEL_PANELS = true;

// ── Parallel-panels helpers ───────────────────────────────────────────────────
// Pure functions so the behaviour can be reasoned about and tested in
// isolation, and toggled off via the PARALLEL_PANELS flag above.

function parallelIsPast(
  flatIndex: number,
  quest: StoredQuest,
  routeStepIds: Set<string>
): boolean {
  const step = quest.flatSteps[flatIndex];
  return !!step && routeStepIds.has(step.id);
}

function parallelPanelFullyAdded(
  panelStartIndex: number,
  panelEndIndex: number,
  quest: StoredQuest,
  routeStepIds: Set<string>
): boolean {
  for (let i = panelStartIndex; i <= panelEndIndex; i++) {
    const step = quest.flatSteps[i];
    if (!step || !routeStepIds.has(step.id)) return false;
  }
  return true;
}

function parallelHandleAddStep(
  flatIndex: number,
  panelStartIndex: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void,
  setActiveStep: (questId: string, index: number) => void
): void {
  for (let i = panelStartIndex; i <= flatIndex; i++) {
    const step = quest.flatSteps[i];
    if (step && !routeStepIds.has(step.id)) appendRoute(step);
  }
  // Update activeStep so the map auto-pans to the last step added.
  setActiveStep(quest.name, flatIndex);
}

function parallelHandleAddPanel(
  panelStartIndex: number,
  panelEndIndex: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void,
  setActiveStep: (questId: string, index: number) => void
): void {
  for (let i = panelStartIndex; i <= panelEndIndex; i++) {
    const step = quest.flatSteps[i];
    if (step && !routeStepIds.has(step.id)) appendRoute(step);
  }
  setActiveStep(quest.name, panelEndIndex);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function QuestViewer() {
  const quest = useSelectedQuest();
  const { setActiveStep, selectQuest } = useQuestActions();
  const { appendRoute } = useRouteActions();
  // Always called so hook order is stable regardless of PARALLEL_PANELS value.
  const route = useRoute();
  const [collapsedPanels, setCollapsedPanels] = useState<Set<number>>(new Set());

  if (!quest) return null;

  const activeStep = quest.activeStep ?? 0;

  // Built once per render; only consumed when PARALLEL_PANELS is true.
  const routeStepIds = new Set(route.map((s) => s.id));

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

  const renderStepRow = (flatIndex: number, panelStartIndex: number) => {
    const flatStep = quest.flatSteps[flatIndex];
    if (!flatStep) return null;

    const isPast = PARALLEL_PANELS
      ? parallelIsPast(flatIndex, quest, routeStepIds)
      : flatIndex < activeStep;

    const handleAddStep = () => {
      if (PARALLEL_PANELS) {
        parallelHandleAddStep(flatIndex, panelStartIndex, quest, routeStepIds, appendRoute, setActiveStep);
      } else {
        for (let i = activeStep; i <= flatIndex; i++) {
          const step = quest.flatSteps[i];
          if (step) appendRoute(step);
        }
        setActiveStep(quest.name, Math.min(flatIndex + 1, quest.flatSteps.length - 1));
      }
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

    const panelFullyAdded = PARALLEL_PANELS
      ? parallelPanelFullyAdded(panelStartIndex, panelEndIndex, quest, routeStepIds)
      : activeStep > panelEndIndex;

    const handleAddPanel = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (PARALLEL_PANELS) {
        parallelHandleAddPanel(panelStartIndex, panelEndIndex, quest, routeStepIds, appendRoute, setActiveStep);
      } else {
        const firstStepToAdd = Math.max(activeStep, panelStartIndex);
        for (let i = firstStepToAdd; i <= panelEndIndex; i++) {
          const step = quest.flatSteps[i];
          if (step) appendRoute(step);
        }
        setActiveStep(quest.name, Math.min(panelEndIndex + 1, quest.flatSteps.length - 1));
      }
    };

    return (
      <Stack key={panelIdx} gap={4}>
        {renderPanelHeader(panel.panelName, panelIdx, isCollapsed, panelFullyAdded, handleAddPanel)}
        <Collapse in={!isCollapsed}>
          <Stack gap={4}>
            {panel.steps.map((_, stepIdx) => renderStepRow(panelStartIndex + stepIdx, panelStartIndex))}
          </Stack>
        </Collapse>
      </Stack>
    );
  };

  return (
    <DraggableBox
      title={quest.name}
      info={"Add steps from the selected quest to your Route.\nSteps can be added in order from a group, and groups can be done out of order (even if you cant in game, this is to allow quests like Dragon Slayer 1 to do the map pieces in any order or even in parallel)"}
      initialPosition={{ x: window.innerWidth - 320 - 12, y: 12 }}
      onClose={() => selectQuest(null)}
    >
      <ScrollArea.Autosize mah={1000} offsetScrollbars>
        <Stack gap="xs">
          {quest.steps.map((panel, panelIdx) => renderPanel(panel, panelIdx))}
        </Stack>
      </ScrollArea.Autosize>
    </DraggableBox>
  );
}
