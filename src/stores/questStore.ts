import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { QuestData, QuestStepWithPoint } from "../types/QuestData";

/** Flatten all steps from all panels into a single array. Used once when loading. */
function flattenSteps(quest: QuestData): QuestStepWithPoint[] {
  const result: QuestStepWithPoint[] = [];
  for (const panel of quest.steps) {
    for (const step of panel.steps) {
      result.push(step);
    }
  }
  return result;
}

/** Quest as stored in the store: includes pre-flattened steps for O(1) access. */
export interface StoredQuest extends QuestData {
  flatSteps: QuestStepWithPoint[];
}

interface QuestState {
  quests: Record<string, StoredQuest>;
  actions: {
    addQuest: (quest: QuestData) => void;
    advanceStep: (questId: string) => void;
  }
}

export const useQuestStore = create<QuestState>((set) => ({
  quests: {},
  actions: {
    addQuest: (quest) =>
      set((state) => {
        const normalized: StoredQuest = {
          ...quest,
          activeStep: quest.activeStep ?? 0,
          flatSteps: flattenSteps(quest),
        };
        return {
          quests: {
            ...state.quests,
            [quest.name]: normalized,
          },
        };
      }),
    advanceStep: (questId) =>
      set((state) => {
        const quest = state.quests[questId];
        if (!quest) return state;
        const maxIndex = Math.max(0, quest.flatSteps.length - 1);
        const next = Math.min((quest.activeStep ?? 0) + 1, maxIndex);
        return {
          quests: {
            ...state.quests,
            [questId]: { ...quest, activeStep: next },
          },
        };
      }),
  }
}));

export const useQuestActions = () => useQuestStore(state => state.actions);

/** Returns quest IDs. Use shallow to avoid over-subscription. */
export function useQuestIds(): string[] {
  return useQuestStore(useShallow((s) => Object.keys(s.quests)));
}

/** Returns active step's WorldPoint for a quest. Use shallow when returning object. */
export function useActiveStep(questId: string): QuestStepWithPoint | undefined {
  return useQuestStore(
    useShallow((s) => {
      const q = s.quests[questId];
      if (!q) return undefined;
      const activeIndex = q.activeStep ?? 0;
      const step = q.flatSteps[activeIndex];
      if (!step) return undefined;
      if (step.worldpoint) return step;
      for (let i = activeIndex - 1; i >= 0; i -= 1) {
        const previousStep = q.flatSteps[i];
        if (previousStep?.worldpoint) {
          return { ...step, worldpoint: previousStep.worldpoint };
        }
      }

      return step;
    })
  );
}
