/**
 * Build-time script: fetches Quest Helper Java quest files from GitHub,
 * parses getPanels(), setupSteps(), getQuestPointReward(), getExperienceRewards(),
 * getItemRewards(), getGeneralRequirements(), getItemRequirements(), setupRequirements(),
 * and writes one JSON file per approved quest to public/data/quests/<slug>.json.
 * Run: npm run build:quests or npx tsx scripts/parse-quest-helper.ts
 */

import * as fs from "fs";
import * as path from "path";
import type { QuestData, WorldPoint, ExperienceReward, LampReward, SkillRequirement, QuestPanel } from "../src/types/QuestData";

const QUEST_HELPER_RAW_BASE =
  "https://raw.githubusercontent.com/Zoinkwiz/quest-helper/master/src/main/java/com/questhelper/helpers/quests";
const APPROVED_QUESTS_PATH = path.join(process.cwd(), "scripts", "approved-quests.json");
const OUTPUT_DIR = path.join(process.cwd(), "public", "data", "quests");

type ApprovedQuests = Record<string, boolean>;

/** Convert "Waterfall Quest" → WaterfallQuest, "Dragon Slayer" → DragonSlayer. */
function displayNameToClassName(name: string): string {
  return name
    .replace(/'/g, "")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/** Convert WaterfallQuest → waterfallquest for folder/slug. */
function classNameToFolder(name: string): string {
  return name.replace(/([A-Z])/g, (m) => m.toLowerCase());
}

/** Convert WaterfallQuest → "Waterfall Quest", MonkeyMadnessII → "Monkey Madness II". */
function classNameToDisplayName(className: string): string {
  return className
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

/** Derive raw GitHub URL for a quest's Java file. */
function questFileUrl(displayName: string): string {
  const className = displayNameToClassName(displayName);
  const folder = classNameToFolder(className);
  return `${QUEST_HELPER_RAW_BASE}/${folder}/${className}.java`;
}

/** Extract method body (content between matching braces). */
function extractMethodBody(source: string, methodName: string): string | null {
  const regex = new RegExp(
    `(?:@Override\\s+)?(?:public|protected)\\s+(?:\\w+(?:<[^>]+>)?\\s+)?${methodName}\\s*\\([^)]*\\)\\s*\\{`,
    "s"
  );
  const match = source.match(regex);
  if (!match) return null;
  const start = match.index! + match[0].length;
  let depth = 1;
  let i = start;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  return source.slice(start, i - 1);
}

/** Parse getQuestPointReward() → number. */
function parseQuestPoints(java: string): number {
  const body = extractMethodBody(java, "getQuestPointReward");
  if (!body) return 0;
  const m = body.match(/new\s+QuestPointReward\s*\(\s*(\d+)\s*\)/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parse getExperienceRewards() → ExperienceReward[]. */
function parseExperienceRewards(java: string): ExperienceReward[] {
  const body = extractMethodBody(java, "getExperienceRewards");
  if (!body) return [];
  const rewards: ExperienceReward[] = [];
  const regex = /new\s+ExperienceReward\s*\(\s*Skill\.(\w+)\s*,\s*(\d+)\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(body)) !== null) {
    rewards.push({ skill: m[1], xp: parseInt(m[2], 10) });
  }
  return rewards;
}

/** Parse getItemRewards() for lamp rewards; return null if none. */
function parseLampRewards(java: string): LampReward | null {
  const body = extractMethodBody(java, "getItemRewards");
  if (!body) return null;
  const lampMatch = body.match(
    /(?:new\s+(?:LampReward|XpLampReward)|ItemReward\s*\(\s*"[^"]*[Ll]amp[^"]*"\s*)[^)]*\)/g
  );
  if (!lampMatch || lampMatch.length === 0) return null;
  const first = lampMatch[0];
  const skillsMatch = first.match(/skills?\s*[=:]\s*"([^"]+)"/) ?? first.match(/"([^"]*[Aa]ny[^"]*)"/);
  const valueMatch = first.match(/value\s*[=:]\s*(\d+)/) ?? first.match(/(\d{3,})/);
  const qtyMatch = first.match(/quantity\s*[=:]\s*(\d+)/) ?? first.match(/,(\d+)\s*\)/);
  return {
    skills: skillsMatch ? skillsMatch[1] : "Any",
    value: valueMatch ? parseInt(valueMatch[1], 10) : 0,
    quantity: qtyMatch ? parseInt(qtyMatch[1], 10) : 1,
  };
}

/** Skill enum constant to display name. */
function skillEnumToDisplay(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Parse getGeneralRequirements(). */
function parseGeneralRequirements(java: string): {
  skillRequirements: SkillRequirement[];
  questRequirements: string[];
  questPointRequirement: number | null;
} {
  const body = extractMethodBody(java, "getGeneralRequirements");
  const skillRequirements: SkillRequirement[] = [];
  const questRequirements: string[] = [];
  let questPointRequirement: number | null = null;

  if (!body) return { skillRequirements, questRequirements, questPointRequirement };

  const skillRegex = /new\s+SkillRequirement\s*\(\s*Skill\.(\w+)\s*,\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = skillRegex.exec(body)) !== null) {
    skillRequirements.push({
      skillName: skillEnumToDisplay(m[1]),
      level: parseInt(m[2], 10),
    });
  }

  const questRegex = /QuestRequirement\s*\(\s*QuestHelperQuest\.(\w+)/g;
  while ((m = questRegex.exec(body)) !== null) {
    const name = m[1].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    if (!questRequirements.includes(name)) questRequirements.push(name);
  }

  const qpMatch = body.match(/new\s+QuestPointRequirement\s*\(\s*(\d+)\s*\)/);
  if (qpMatch) questPointRequirement = parseInt(qpMatch[1], 10);

  return { skillRequirements, questRequirements, questPointRequirement };
}

/** Parse getItemRequirements() to get list of variable names. */
function parseItemRequirementVarNames(java: string): string[] {
  const body = extractMethodBody(java, "getItemRequirements");
  if (!body) return [];
  const names: string[] = [];
  const listMatch = body.match(/List\.of\s*\(\s*([^)]+)\)/) ?? body.match(/Arrays\.asList\s*\(\s*([^)]+)\)/);
  if (listMatch) {
    const inner = listMatch[1];
    const vars = inner.split(",").map((s) => s.trim());
    for (const v of vars) {
      const name = v.split(/\s+/).pop() ?? v;
      if (name && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) names.push(name);
    }
    return names;
  }
  const addRegex = /(?:reqs\.add|\.add)\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g;
  let am: RegExpExecArray | null;
  while ((am = addRegex.exec(body)) !== null) {
    names.push(am[1]);
  }
  return names;
}

/** Parse setupRequirements() to build varName → display string. */
function parseSetupRequirements(java: string): Map<string, string> {
  const body = extractMethodBody(java, "setupRequirements");
  const displayByVar = new Map<string, string>();
  const alias = new Map<string, string>();

  if (!body) return displayByVar;

  const reqRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+ItemRequirement\s*\(\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = reqRegex.exec(body)) !== null) {
    displayByVar.set(m[1], m[2]);
  }

  const aliasRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.(?:highlighted|alsoCheckBank)\s*\(\s*\)/g;
  while ((m = aliasRegex.exec(body)) !== null) {
    alias.set(m[1], m[2]);
  }

  function resolve(name: string): string | undefined {
    const direct = displayByVar.get(name);
    if (direct) return direct;
    const target = alias.get(name);
    if (target) return resolve(target);
    return undefined;
  }

  const result = new Map<string, string>();
  for (const [k, v] of displayByVar) result.set(k, v);
  for (const [k] of alias) {
    const resolved = resolve(k);
    if (resolved) result.set(k, resolved);
  }
  return result;
}

function resolveItemRequirements(
  varNames: string[],
  setupReqs: Map<string, string>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of varNames) {
    const display = setupReqs.get(v);
    if (display && !seen.has(display)) {
      seen.add(display);
      out.push(display);
    }
  }
  return out;
}

/** Parse getPanels() → { panelName, stepVarNames }[]. */
function parsePanels(java: string): { panelName: string; stepVarNames: string[] }[] {
  const body = extractMethodBody(java, "getPanels");
  const panels: { panelName: string; stepVarNames: string[] }[] = [];
  if (!body) return panels;

  const panelRegex = /(?:new\s+)?PanelDetails\s*\(\s*"([^"]+)"\s*,\s*(?:List\.of\s*\(([^)]+)\)|Arrays\.asList\s*\(([^)]+)\)|Collections\.singletonList\s*\(([^)]+)\))/g;
  let m: RegExpExecArray | null;
  while ((m = panelRegex.exec(body)) !== null) {
    const title = m[1];
    const stepsSource = m[2] ?? m[3] ?? m[4] ?? "";
    const stepVars = stepsSource
      .split(",")
      .map((s) => s.trim().split(/\s+/).pop() ?? s.trim())
      .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));
    panels.push({ panelName: title, stepVarNames: stepVars });
  }

  return panels;
}

/** Parse setupSteps() → stepVarName → { stepDescription, worldpoint }. */
function parseSetupSteps(java: string): Map<string, { stepDescription: string; worldpoint: WorldPoint }> {
  const body = extractMethodBody(java, "setupSteps");
  const map = new Map<string, { stepDescription: string; worldpoint: WorldPoint }>();
  if (!body) return map;

  // Merge Java string concatenation: "first" + "second" by parsing from opening " position
  const readConcatenatedString = (openQuoteIndex: number): string => {
    const parts: string[] = [];
    let i = openQuoteIndex;
    while (i < body.length) {
      i++; // skip opening "
      let s = "";
      while (i < body.length) {
        const c = body[i];
        if (c === "\\") {
          i += 2;
          continue;
        }
        if (c === '"') {
          i++;
          break;
        }
        s += c;
        i++;
      }
      parts.push(s);
      while (i < body.length && /[\s]/.test(body[i])) i++;
      if (body[i] !== "+") break;
      i++;
      while (i < body.length && /[\s]/.test(body[i])) i++;
      if (body[i] !== '"') break;
    }
    return parts.join("");
  };

  const stepAssignRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+(?:NpcStep|ObjectStep)\s*\(\s*this\s*,\s*[^,]+,\s*new\s+WorldPoint\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*,\s*"/g;
  let m: RegExpExecArray | null;
  while ((m = stepAssignRegex.exec(body)) !== null) {
    const strStart = m.index + m[0].length - 1;
    const desc = readConcatenatedString(strStart);
    map.set(m[1], {
      stepDescription: desc,
      worldpoint: {
        x: parseInt(m[2], 10),
        y: parseInt(m[3], 10),
        plane: parseInt(m[4], 10),
      },
    });
  }

  const objectStepRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+ObjectStep\s*\(\s*this\s*,\s*[^,]+,\s*new\s+WorldPoint\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*,\s*"/g;
  while ((m = objectStepRegex.exec(body)) !== null) {
    if (!map.has(m[1])) {
      const strStart = m.index + m[0].length - 1;
      const desc = readConcatenatedString(strStart);
      map.set(m[1], {
        stepDescription: desc,
        worldpoint: {
          x: parseInt(m[2], 10),
          y: parseInt(m[3], 10),
          plane: parseInt(m[4], 10),
        },
      });
    }
  }

  return map;
}

function buildSteps(
  panels: { panelName: string; stepVarNames: string[] }[],
  stepData: Map<string, { stepDescription: string; worldpoint: WorldPoint }>
): QuestPanel[] {
  const result: QuestPanel[] = [];
  for (const panel of panels) {
    const steps: QuestPanel["steps"] = [];
    for (const varName of panel.stepVarNames) {
      const data = stepData.get(varName);
      if (data) steps.push({ stepDescription: data.stepDescription, worldpoint: data.worldpoint });
    }
    result.push({ panelName: panel.panelName, steps });
  }
  return result;
}

function extractClassName(java: string): string {
  const m = java.match(/public\s+class\s+(\w+)\s+extends/);
  return m ? m[1] : "";
}

async function fetchQuestFile(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "osrs-route-builder/1.0 (quest step extraction)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function writeQuestFile(slug: string, data: QuestData): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, `${slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Wrote ${filePath}`);
}

async function main(): Promise<void> {
  let approved: ApprovedQuests = {};
  try {
    const raw = fs.readFileSync(APPROVED_QUESTS_PATH, "utf-8");
    approved = JSON.parse(raw) as ApprovedQuests;
  } catch (err) {
    console.error("Failed to read approved-quests.json:", err);
    process.exit(1);
  }

  const toProcess = Object.entries(approved)
    .filter(([, v]) => v === true)
    .map(([name]) => name);

  if (toProcess.length === 0) {
    console.log("No approved quests with value true.");
    return;
  }

  for (const displayName of toProcess) {
    const url = questFileUrl(displayName);
    let java: string;
    try {
      java = await fetchQuestFile(url);
    } catch (err) {
      console.warn(`Skipping "${displayName}": fetch failed –`, (err as Error).message);
      continue;
    }

    const className = extractClassName(java);
    const name = className ? classNameToDisplayName(className) : displayName;
    const slug = className ? classNameToFolder(className) : classNameToFolder(displayNameToClassName(displayName));

    const questPoints = parseQuestPoints(java);
    const experienceRewards = parseExperienceRewards(java);
    const lampRewards = parseLampRewards(java);
    const { skillRequirements, questRequirements, questPointRequirement } = parseGeneralRequirements(java);
    const itemVarNames = parseItemRequirementVarNames(java);
    const setupReqs = parseSetupRequirements(java);
    const itemRequirements = resolveItemRequirements(itemVarNames, setupReqs);
    const panels = parsePanels(java);
    const stepData = parseSetupSteps(java);
    const steps = buildSteps(panels, stepData);

    const data: QuestData = {
      name,
      questPoints,
      experienceRewards,
      lampRewards,
      skillRequirements,
      questRequirements,
      questPointRequirement,
      itemRequirements,
      steps,
    };

    try {
      writeQuestFile(slug, data);
    } catch (err) {
      console.warn(`Skipping "${displayName}": write failed –`, (err as Error).message);
    }
  }

  console.log("Done.");
}

main();
