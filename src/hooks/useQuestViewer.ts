import { useState } from "react";
import { useSelectedQuest, useQuestActions } from "../stores/questStore";
import type { StoredQuest } from "../stores/questStore";
import { useRoute, useRouteActions } from "../stores/routeStore";
import type { QuestStep } from "../types/Steps";

// ── Shared helpers ────────────────────────────────────────────────────────────

function addStepsInRange(
  from: number,
  to: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void
): void {
  for (let i = from; i <= to; i++) {
    const step = quest.flatSteps[i];
    if (step && !routeStepIds.has(step.id)) appendRoute(step);
  }
}

// ── Parallel-panels helpers ───────────────────────────────────────────────────

function parallelIsPast(flatIndex: number, quest: StoredQuest, routeStepIds: Set<string>): boolean {
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

function allStepsWillBeInRoute(
  quest: StoredQuest,
  routeStepIds: Set<string>,
  addedFrom: number,
  addedTo: number
): boolean {
  for (let i = 0; i < quest.flatSteps.length; i++) {
    if (i >= addedFrom && i <= addedTo) continue;
    if (!routeStepIds.has(quest.flatSteps[i].id)) return false;
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
  addStepsInRange(panelStartIndex, flatIndex, quest, routeStepIds, appendRoute);
  const done = allStepsWillBeInRoute(quest, routeStepIds, panelStartIndex, flatIndex);
  setActiveStep(quest.name, done ? quest.flatSteps.length : flatIndex);
}

function parallelHandleAddPanel(
  panelStartIndex: number,
  panelEndIndex: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void,
  setActiveStep: (questId: string, index: number) => void
): void {
  addStepsInRange(panelStartIndex, panelEndIndex, quest, routeStepIds, appendRoute);
  const done = allStepsWillBeInRoute(quest, routeStepIds, panelStartIndex, panelEndIndex);
  setActiveStep(quest.name, done ? quest.flatSteps.length : panelEndIndex);
}

// ── Sequential helpers ────────────────────────────────────────────────────────

function sequentialHandleAddStep(
  flatIndex: number,
  activeStep: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void,
  setActiveStep: (questId: string, index: number) => void
): void {
  addStepsInRange(activeStep, flatIndex, quest, routeStepIds, appendRoute);
  setActiveStep(quest.name, flatIndex + 1);
}

function sequentialHandleAddPanel(
  panelStartIndex: number,
  panelEndIndex: number,
  activeStep: number,
  quest: StoredQuest,
  routeStepIds: Set<string>,
  appendRoute: (step: QuestStep) => void,
  setActiveStep: (questId: string, index: number) => void
): void {
  const firstStepToAdd = Math.max(activeStep, panelStartIndex);
  addStepsInRange(firstStepToAdd, panelEndIndex, quest, routeStepIds, appendRoute);
  setActiveStep(quest.name, panelEndIndex + 1);
}

// ─────────────────────────────────────────────────────────────────────────────

export interface QuestViewerState {
  quest: StoredQuest | undefined;
  panelStartIndices: number[];
  parallelPanels: boolean;
  setParallelPanels: (value: boolean) => void;
  hasStepsInRoute: boolean;
  isPanelFullyAdded: (panelStartIndex: number, panelEndIndex: number) => boolean;
  isStepPast: (flatIndex: number, panelStartIndex: number) => boolean;
  handleAddStep: (flatIndex: number, panelStartIndex: number) => void;
  handleAddPanel: (panelStartIndex: number, panelEndIndex: number) => void;
  isQuestComplete: boolean;
  closeViewer: () => void;
}

export function useQuestViewer(): QuestViewerState {
  const quest = useSelectedQuest();
  const { setActiveStep, selectQuest } = useQuestActions();
  const { appendRoute } = useRouteActions();
  const route = useRoute();

  // Per-quest parallel setting keyed by quest name; defaults to true (parallel).
  const [parallelPanelsByQuest, setParallelPanelsByQuest] = useState<Record<string, boolean>>({});

  const questName = quest?.name ?? "";
  const parallelPanels = parallelPanelsByQuest[questName] ?? true;

  const setParallelPanels = (value: boolean) => {
    setParallelPanelsByQuest((prev) => ({ ...prev, [questName]: value }));
  };

  const routeStepIds = new Set(route.map((s) => s.id));

  const panelStartIndices = quest
    ? quest.steps.reduce<number[]>((acc, _, idx) => {
        acc.push(idx === 0 ? 0 : acc[idx - 1] + quest.steps[idx - 1].steps.length);
        return acc;
      }, [])
    : [];

  const hasStepsInRoute = quest?.flatSteps.some((s) => routeStepIds.has(s.id)) ?? false;

  const activeStep = quest?.activeStep ?? 0;

  const isPanelFullyAdded = (panelStartIndex: number, panelEndIndex: number): boolean => {
    if (!quest) return false;
    return parallelPanels
      ? parallelPanelFullyAdded(panelStartIndex, panelEndIndex, quest, routeStepIds)
      : activeStep > panelEndIndex;
  };

  const isStepPast = (flatIndex: number, _panelStartIndex: number): boolean => {
    if (!quest) return false;
    return parallelPanels
      ? parallelIsPast(flatIndex, quest, routeStepIds)
      : flatIndex < activeStep;
  };

  const handleAddStep = (flatIndex: number, panelStartIndex: number): void => {
    if (!quest) return;
    if (parallelPanels) {
      parallelHandleAddStep(flatIndex, panelStartIndex, quest, routeStepIds, appendRoute, setActiveStep);
    } else {
      sequentialHandleAddStep(flatIndex, activeStep, quest, routeStepIds, appendRoute, setActiveStep);
    }
  };

  const handleAddPanel = (panelStartIndex: number, panelEndIndex: number): void => {
    if (!quest) return;
    if (parallelPanels) {
      parallelHandleAddPanel(panelStartIndex, panelEndIndex, quest, routeStepIds, appendRoute, setActiveStep);
    } else {
      sequentialHandleAddPanel(panelStartIndex, panelEndIndex, activeStep, quest, routeStepIds, appendRoute, setActiveStep);
    }
  };

  const isQuestComplete = quest ? activeStep >= quest.flatSteps.length : false;

  const closeViewer = () => selectQuest(null);

  return {
    quest,
    panelStartIndices,
    parallelPanels,
    setParallelPanels,
    hasStepsInRoute,
    isPanelFullyAdded,
    isStepPast,
    handleAddStep,
    handleAddPanel,
    isQuestComplete,
    closeViewer,
  };
}
