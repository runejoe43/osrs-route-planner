import { v5 as uuidv5 } from "uuid";
import type { RawStep, QuestStep } from "../types/Steps";

/** Stable namespace for deterministic step ID generation. */
const STEP_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // UUID v5 URL namespace

export function createQuestStep(data: Omit<QuestStep, 'kind' | 'xpGained'>): QuestStep {
  return { ...data, kind: 'quest', xpGained: false };
}

/**
 * Convert a RawStep (from JSON) into a full QuestStep.
 * ID is deterministically generated from the description using UUID v5.
 */
export function createQuestStepFromRaw(raw: RawStep): QuestStep {
  const id = uuidv5(raw.description, STEP_NAMESPACE);
  return {
    id,
    description: raw.description,
    worldpoint: raw.worldpoint,
    kind: "quest",
    xpGained: false,
  };
}
