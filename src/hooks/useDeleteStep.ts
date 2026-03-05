import type { QuestStep } from "../types/Steps";
import { useRoute, useRouteActions } from "../stores/routeStore";
import { useQuestActions, useQuestStore } from "../stores/questStore";

/**
 * Returns a delete handler that cascades: when a quest step is deleted, all
 * subsequent steps of the same quest in the route are also removed and the
 * quest's activeStep is reset to the deleted step's flat index.
 *
 * The grouping-by-quest and route-position logic is isolated here so that
 * future drag-and-drop reordering only needs to update this hook.
 */
export function useDeleteStep(): (stepId: string) => void {
  const route = useRoute();
  const { deleteSteps } = useRouteActions();
  const { setActiveStep } = useQuestActions();
  const quests = useQuestStore((s) => s.quests);

  return (stepId: string) => {
    const stepIndex = route.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const step = route[stepIndex] as QuestStep;
    const { questId } = step;

    const idsToDelete = route
      .slice(stepIndex)
      .filter((s): s is QuestStep => s.kind === "quest" && s.questId === questId)
      .map((s) => s.id);

    const flatIndex = quests[questId]?.flatSteps.findIndex((s) => s.id === stepId) ?? 0;

    deleteSteps(idsToDelete);
    setActiveStep(questId, flatIndex);
  };
}
