/**
 * Types for quest data extracted from Quest Helper Java source.
 * Used by parse-quest-helper.ts output and app consumption.
 * WorldPoint mirrors src/util/Coordinates.tsx for schema alignment.
 */

export interface WorldPoint {
  x: number;
  y: number;
  plane: number;
}

export interface ExperienceReward {
  skill: string;
  xp: number;
}

export interface LampReward {
  skills: string;
  value: number;
  quantity: number;
}

export interface SkillRequirement {
  skillName: string;
  level: number;
}

export interface QuestStepWithPoint {
  stepDescription: string;
  worldpoint: WorldPoint;
}

export interface QuestPanel {
  panelName: string;
  steps: QuestStepWithPoint[];
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
}
