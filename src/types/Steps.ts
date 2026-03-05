import type { WorldPoint } from "./QuestData";

/** Minimal step shape written to JSON by the parse script. */
export interface RawStep {
  description: string;
  worldpoint?: WorldPoint;
}

export interface BaseStep {
  id: string;
  description: string;
  xpGained: boolean;
}

export interface QuestStep extends BaseStep {
  kind: "quest";
  worldpoint?: WorldPoint;
}

export type Step = QuestStep;