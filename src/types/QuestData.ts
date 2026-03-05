/**
 * Types for quest data extracted from Quest Helper Java source.
 * Used by parse-quest-helper.ts output and app consumption.
 * WorldPoint mirrors src/util/Coordinates.tsx for schema alignment.
 */

import type { RawStep } from "./Steps";

export interface WorldPoint {
  x: number;
  y: number;
  plane: number;
}

/** OSRS skill — maps to string value for JSON serialization. */
export const Skill = {
  ATTACK: "ATTACK",
  STRENGTH: "STRENGTH",
  DEFENCE: "DEFENCE",
  RANGED: "RANGED",
  PRAYER: "PRAYER",
  MAGIC: "MAGIC",
  RUNECRAFT: "RUNECRAFT",
  HITPOINTS: "HITPOINTS",
  CRAFTING: "CRAFTING",
  MINING: "MINING",
  SMITHING: "SMITHING",
  FISHING: "FISHING",
  COOKING: "COOKING",
  FIREMAKING: "FIREMAKING",
  WOODCUTTING: "WOODCUTTING",
  AGILITY: "AGILITY",
  HERBLORE: "HERBLORE",
  THIEVING: "THIEVING",
  FLETCHING: "FLETCHING",
  SLAYER: "SLAYER",
  FARMING: "FARMING",
  CONSTRUCTION: "CONSTRUCTION",
  HUNTER: "HUNTER",
  SAILING: "SAILING",
} as const;

export type Skill = (typeof Skill)[keyof typeof Skill];

export interface ExperienceReward {
  skill: Skill;
  xp: number;
}

export interface LampReward {
  skills: string;
  value: number;
  quantity: number;
}

export interface SkillRequirement {
  skill: Skill;
  level: number;
}

export interface QuestPanel {
  panelName: string;
  steps: RawStep[];
}

export interface QuestData {
  name: string;
  questPoints: number;
  experienceRewards: ExperienceReward[];
  lampRewards: LampReward | null;
  skillRequirements: SkillRequirement[];
  questRequirements: string[];
  questPointRequirement: number | null;
  itemRequirements: string[];
  steps: QuestPanel[];
  activeStep: number;
}
