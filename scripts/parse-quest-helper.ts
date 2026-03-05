#!/usr/bin/env npx ts-node

/**
 * parseQuestPanels.ts
 *
 * Fetches quest-helper Java files from the zoinkwiz/quest-helper GitHub repo,
 * parses getPanels() and setupSteps(), and outputs structured panel/step data.
 *
 * Quest URLs are built from scripts/approved-quests.json using the pattern:
 *   <questname>/<QuestName>.java  (lowercase / PascalCase.java)
 *
 * Usage:
 *   npx tsx scripts/parseQuestPanels.ts
 */

import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import type {
  QuestData,
  QuestPanel,
  WorldPoint,
} from "../src/types/QuestData";
import type { RawStep } from "../src/types/Steps";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/Zoinkwiz/quest-helper/refs/heads/master/src/main/java/com/questhelper/helpers/quests";

const APPROVED_QUESTS_PATH = path.join(__dirname, "approved-quests.json");
const QUESTS_OUTPUT_DIR = path.join(__dirname, "..", "public", "data", "quests");

/**
 * Convert a quest display name (e.g. "Tree Gnome Village") to camelCase for filenames.
 */
function questNameToCamelCase(questName: string): string {
  const words = questName
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "quest";
  const first = words[0].toLowerCase();
  const rest = words
    .slice(1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return first + rest;
}

/**
 * Convert a quest display name (e.g. "Tree Gnome Village") to the URL path pattern
 * <questname>/<QuestName>.java (lowercase / PascalCase).
 */
function questNameToPath(questName: string): string {
  const words = questName
    .replace(/'/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const base = words.join("").toLowerCase();
  const pascal = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
  return `${base}/${pascal}`;
}

function loadApprovedQuests(): string[] {
  const data = JSON.parse(
    fs.readFileSync(APPROVED_QUESTS_PATH, "utf-8")
  ) as Record<string, boolean>;
  return Object.keys(data).filter((name) => data[name] === true);
}

// ─── Types ────────────────────────────────────────────────────────────────────




// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchQuestFile(questPath: string): Promise<string> {
  const url = `${GITHUB_RAW_BASE}/${questPath}.java`;
  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// ─── Core utilities ───────────────────────────────────────────────────────────

/**
 * Replace string literal contents and comments with spaces,
 * preserving character indices so cleaned and original stay aligned.
 */
function stripCommentsAndStrings(code: string): string {
  let result = "";
  let i = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;

  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        result += "\n";
        inLineComment = false;
      } else {
        result += " ";
      }
      i++;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        result += "  ";
        i += 2;
        inBlockComment = false;
      } else {
        result += ch === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    if (inString) {
      if (ch === "\\" && i + 1 < code.length) {
        result += "  ";
        i += 2;
      } else if (ch === '"') {
        result += '"';
        i++;
        inString = false;
      } else {
        result += ch === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      result += "  ";
      i += 2;
      inLineComment = true;
      continue;
    }

    if (ch === "/" && next === "*") {
      result += "  ";
      i += 2;
      inBlockComment = true;
      continue;
    }

    if (ch === '"') {
      result += '"';
      i++;
      inString = true;
      continue;
    }

    result += ch;
    i++;
  }
  return result;
}

/**
 * Find the index of the matching closing delimiter starting from openIdx.
 */
function findMatchingClose(
  code: string,
  openIdx: number,
  openChar: string,
  closeChar: string
): number {
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    if (code[i] === openChar) depth++;
    else if (code[i] === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split `original` on top-level commas, using a stripped copy to find
 * split points. This correctly handles "str1" + "str2", nextArg because
 * string contents (including embedded commas) are masked in the cleaned copy.
 */
function splitTopLevelArgs(original: string): string[] {
  const cleaned = stripCommentsAndStrings(original);
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "(" || ch === "[" || ch === "<") depth++;
    else if (ch === ")" || ch === "]" || ch === ">") depth--;
    else if (ch === "," && depth === 0) {
      args.push(original.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (original.slice(start).trim()) args.push(original.slice(start).trim());
  return args;
}

/**
 * Extract and join all string literal parts from an expression like:
 *   "part one " + "part two" + "part three"
 */
function extractStringArg(s: string): string {
  const parts: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === '"') {
      i++;
      let part = "";
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < s.length) {
          part += s[i + 1];
          i += 2;
        } else {
          part += s[i];
          i++;
        }
      }
      parts.push(part);
      i++; // closing quote
    } else {
      i++;
    }
  }
  return parts.join("");
}

/**
 * Extract a WorldPoint from a raw argument string containing new WorldPoint(x, y, plane).
 */
function extractWorldPoint(raw: string): WorldPoint | undefined {
  const cleaned = stripCommentsAndStrings(raw);
  const idx = cleaned.search(/new\s+WorldPoint\s*\(/);
  if (idx === -1) return undefined;
  const openParen = idx + cleaned.slice(idx).indexOf("(");
  const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
  const inside = raw.slice(openParen + 1, closeParen);
  const parts = splitTopLevelArgs(inside).map((s) => parseInt(s.trim(), 10));
  if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
    return { x: parts[0], y: parts[1], plane: parts[2] };
  }
  return undefined;
}

/**
 * Resolve a WorldPoint argument from either:
 * - inline constructor syntax: new WorldPoint(x, y, plane)
 * - a plain identifier previously declared in setupSteps()
 */
function resolveWorldPointArg(
  raw: string,
  worldPointVars: Map<string, WorldPoint>
): WorldPoint | undefined {
  const inline = extractWorldPoint(raw);
  if (inline) return inline;
  const token = raw.trim();
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
    return worldPointVars.get(token);
  }
  return undefined;
}

/**
 * Extract the body of a method matched by methodPattern using brace-depth tracking.
 */
function extractMethodBody(source: string, methodPattern: RegExp): string | null {
  const methodStart = source.search(methodPattern);
  if (methodStart === -1) return null;
  let braceDepth = 0, inMethod = false, bodyStart = -1, bodyEnd = -1;
  for (let i = methodStart; i < source.length; i++) {
    if (source[i] === "{") {
      braceDepth++;
      if (!inMethod) { inMethod = true; bodyStart = i + 1; }
    } else if (source[i] === "}") {
      braceDepth--;
      if (inMethod && braceDepth === 0) { bodyEnd = i; break; }
    }
  }
  return source.slice(bodyStart, bodyEnd);
}

// ─── Step constructor dispatch ────────────────────────────────────────────────
//
// Constructor argument mappings (1-indexed in spec, 0-indexed here):
//
//   NpcStep / ObjectStep      worldPoint=arg[2]? description=arg[2]/arg[3]
//   ConditionalStep           description=arg[2] worldPoint=none
//   ItemStep                  description=arg[1] worldPoint=none
//   DetailedQuestStep         arg[1] is WorldPoint OR description string
//   PuzzleWrapperStep         description=last string arg, worldPoint=none

function parseStepConstructor(
  constructorName: string,
  argsRaw: string,
  worldPointVars: Map<string, WorldPoint>
): ParsedStep {
  const args = splitTopLevelArgs(argsRaw);
  const knownCustomdescriptions: Record<string, string> = {
    PaintingWall: "Click the highlighted boxes to turn the squares to solve the puzzle.",
  };

  if (["NpcStep", "ObjectStep"].includes(constructorName)) {
    // NpcStep/ObjectStep overloads can have description at arg[2] or arg[3]
    // depending on whether a WorldPoint argument is present.
    const worldpoint = args
      .slice(2)
      .map((arg) => resolveWorldPointArg(arg, worldPointVars))
      .find((wp): wp is WorldPoint => wp !== undefined);
    const description =
      args
        .slice(2)
        .map((arg) => extractStringArg(arg))
        .find((s) => s.length > 0) ?? "";

    return {
      worldpoint,
      description,
    };
  }

  if (constructorName === "ConditionalStep") {
    return {
      description: args[2] ? extractStringArg(args[2]) : "",
    };
  }

  if (constructorName === "ItemStep") {
    // ItemStep overloads can be:
    //   ItemStep(this, "description", ...)
    //   ItemStep(this, new WorldPoint(...), "description", ...)
    const worldpoint = args
      .slice(1)
      .map((arg) => resolveWorldPointArg(arg, worldPointVars))
      .find((wp): wp is WorldPoint => wp !== undefined);
    const description =
      args
        .slice(1)
        .map((arg) => extractStringArg(arg))
        .find((s) => s.length > 0) ?? "";
    return {
      worldpoint,
      description,
    };
  }

  if (["DigStep", "TileStep"].includes(constructorName)) {
    return {
      worldpoint: args[1] ? resolveWorldPointArg(args[1], worldPointVars) : undefined,
      description: args[2] ? extractStringArg(args[2]) : "",
    };
  }

  if (constructorName === "WidgetStep") {
    return {
      description: args[1] ? extractStringArg(args[1]) : "",
    };
  }

  if (constructorName === "DetailedQuestStep") {
    // arg[1] is either a WorldPoint or the description string
    const worldpoint = args[1]
      ? resolveWorldPointArg(args[1], worldPointVars)
      : undefined;
    if (worldpoint) {
      return {
        worldpoint,
        description: args[2] ? extractStringArg(args[2]) : "",
      };
    }
    return {
      description: args[1] ? extractStringArg(args[1]) : "",
    };
  }

  if (constructorName === "PuzzleWrapperStep") {
    // arg[1] is the wrapped step constructor (e.g. new ObjectStep(...), new DetailedQuestStep(...))
    // Delegate to the existing logic by extracting its constructor name and args recursively
    const wrappedArg = (args[1] ?? "").trim();
    const cleanedWrapped = stripCommentsAndStrings(wrappedArg);
    const innerMatch = cleanedWrapped.match(/^new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (innerMatch) {
      const innerConstructor = innerMatch[1];
      const openParen = wrappedArg.indexOf("(");
      const closeParen = findMatchingClose(wrappedArg, openParen, "(", ")");
      const innerArgsRaw = wrappedArg.slice(openParen + 1, closeParen);
      return parseStepConstructor(innerConstructor, innerArgsRaw, worldPointVars);
    }
    return { description: "UNKNOWN STEP" };
  }

  const fallbackFromStrings =
    args.map((arg) => extractStringArg(arg)).find((s) => s.length > 0) ?? "";
  return {
    description:
      knownCustomdescriptions[constructorName] ||
      fallbackFromStrings ||
      "UNKNOWN STEP",
  };
}

// ─── addStep resolver ─────────────────────────────────────────────────────────

/**
 * Finds all varName.addStep(...) calls in a method body and returns the
 * plain-identifier step variable names from arg[1] of each call, in order.
 * Calls where arg[1] is a complex expression (e.g. new Conditions(...)) are skipped.
 */
function findAddStepVarNames(methodBody: string, varName: string): string[] {
  const cleaned = stripCommentsAndStrings(methodBody);
  const pattern = new RegExp(`\\b${varName}\\s*\\.\\s*addStep\\s*\\(`, "g");
  const results: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;
    const argsRaw = methodBody.slice(openParen + 1, closeParen);
    const stepArg = (splitTopLevelArgs(argsRaw)[1] ?? "").trim();
    // Only accept plain identifiers — skip new Conditions(...), and(...), etc.
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(stepArg)) results.push(stepArg);
  }

  return results;
}

/**
 * Returns the plain-identifier arg[1] of a ConditionalStep constructor —
 * the default step it delegates to when no condition matches.
 */
function getConditionalStepDefaultVar(body: string, varName: string): string | undefined {
  const cleaned = stripCommentsAndStrings(body);
  const pattern = new RegExp(
    `(?:var\\s+)?${varName}\\s*=\\s*new\\s+ConditionalStep\\s*\\(`,
    "g"
  );
  const match = pattern.exec(cleaned);
  if (!match) return undefined;
  const openParen = match.index + match[0].length - 1;
  const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
  if (closeParen === -1) return undefined;
  const args = splitTopLevelArgs(body.slice(openParen + 1, closeParen));
  // arg[0] = this, arg[1] = default step variable
  const defaultVar = (args[1] ?? "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(defaultVar) ? defaultVar : undefined;
}

/**
 * Recursively resolves a WorldPoint for a step variable:
 * 1. Returns immediately if the step already has a WorldPoint.
 * 2. Tries the last plain-identifier addStep arg (most-specific condition = final destination).
 * 3. Falls back to the ConditionalStep's own arg[1] (the default delegate step).
 * A visited set prevents infinite loops from circular references.
 */
function resolveWorldPoint(
  varName: string,
  stepMap: Map<string, ParsedStep>,
  body: string,
  visited: Set<string>
): WorldPoint | undefined {
  if (visited.has(varName)) return undefined;
  visited.add(varName);

  const step = stepMap.get(varName);
  if (!step) return undefined;
  if (step.worldpoint) return step.worldpoint;

  // Try addStep vars first — last one is the most-specific condition
  const addStepVars = findAddStepVarNames(body, varName);
  if (addStepVars.length > 0) {
    const wp = resolveWorldPoint(addStepVars[addStepVars.length - 1], stepMap, body, visited);
    if (wp) return wp;
  }

  // Fallback: try the ConditionalStep's own default delegate (arg[1])
  const defaultVar = getConditionalStepDefaultVar(body, varName);
  if (defaultVar) {
    return resolveWorldPoint(defaultVar, stepMap, body, visited);
  }

  return undefined;
}

function extractTextFromListCall(raw: string): string | undefined {
  const cleaned = stripCommentsAndStrings(raw);
  const listMatch = cleaned.match(/^(?:Arrays\.asList|List\.of)\s*\(/);
  if (!listMatch) return undefined;
  const openParen = raw.indexOf("(");
  const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
  if (closeParen === -1) return undefined;
  const listArgs = splitTopLevelArgs(raw.slice(openParen + 1, closeParen))
    .map((arg) => extractStringArg(arg).trim())
    .filter((s) => s.length > 0);
  if (listArgs.length === 0) return undefined;
  return listArgs.join(" ");
}

function parseStringListDeclarations(body: string): Map<string, string> {
  const cleaned = stripCommentsAndStrings(body);
  const textLists = new Map<string, string>();
  const pattern =
    /(?:final\s+)?(?:List(?:\s*<[^>]+>)?|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:Arrays\.asList|List\.of)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const varName = match[1];
    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;
    const listArgs = splitTopLevelArgs(body.slice(openParen + 1, closeParen))
      .map((arg) => extractStringArg(arg).trim())
      .filter((s) => s.length > 0);
    const text = listArgs.length > 0 ? listArgs.join(" ") : undefined;
    if (text) textLists.set(varName, text);
  }

  return textLists;
}

function applySetTextOverrides(
  body: string,
  stepMap: Map<string, ParsedStep>,
  textLists: Map<string, string>
): void {
  const cleaned = stripCommentsAndStrings(body);
  const pattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*setText\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const varName = match[1];
    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;
    const argRaw = body.slice(openParen + 1, closeParen).trim();

    // Prefer structured list parsing to preserve separators between entries.
    let text = extractTextFromListCall(argRaw) ?? "";
    if (!text) text = extractStringArg(argRaw);
    if (!text && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(argRaw)) {
      text = textLists.get(argRaw) ?? "";
    }
    if (!text) continue;

    const step = stepMap.get(varName);
    if (step) step.description = text;
  }
}

// ─── setupSteps parser ────────────────────────────────────────────────────────

function parseWorldPointDeclarations(body: string): Map<string, WorldPoint> {
  const cleaned = stripCommentsAndStrings(body);
  const worldPointVars = new Map<string, WorldPoint>();
  const pattern =
    /(?:final\s+)?(?:WorldPoint|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+WorldPoint\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const varName = match[1];
    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;
    const rhs = body.slice(match.index, closeParen + 1);
    const worldpoint = extractWorldPoint(rhs);
    if (worldpoint) worldPointVars.set(varName, worldpoint);
  }

  return worldPointVars;
}

function parseStepsFromMethod(
  source: string,
  methodPattern: RegExp,
  stepMap: Map<string, ParsedStep>,
  worldPointVars: Map<string, WorldPoint>,
  allowOverwrite: boolean
): string {
  const body = extractMethodBody(source, methodPattern);
  if (!body) return "";

  for (const [key, value] of parseWorldPointDeclarations(body)) {
    worldPointVars.set(key, value);
  }

  const cleaned = stripCommentsAndStrings(body);

  // Parse `foo = new SomeStep(...)` declarations.
  const constructorPattern =
    /(?:var\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let constructorMatch: RegExpExecArray | null;
  while ((constructorMatch = constructorPattern.exec(cleaned)) !== null) {
    const varName = constructorMatch[1];
    const constructorName = constructorMatch[2];

    const openParen = constructorMatch.index + constructorMatch[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;

    const argsRaw = body.slice(openParen + 1, closeParen);
    if (!allowOverwrite && stepMap.has(varName)) continue;
    stepMap.set(varName, parseStepConstructor(constructorName, argsRaw, worldPointVars));
  }

  // Parse copy assignments such as: goTalkToCharlie3 = goTalkToCharlie.copy();
  const copyPattern =
    /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*copy\s*\(\s*\)/g;
  let copyMatch: RegExpExecArray | null;
  while ((copyMatch = copyPattern.exec(cleaned)) !== null) {
    const toVar = copyMatch[1];
    const fromVar = copyMatch[2];
    if (!allowOverwrite && stepMap.has(toVar)) continue;
    const sourceStep = stepMap.get(fromVar);
    if (sourceStep) {
      stepMap.set(toVar, { ...sourceStep });
    }
  }

  applySetTextOverrides(body, stepMap, parseStringListDeclarations(body));

  return body;
}

function parseAllSteps(source: string): Map<string, ParsedStep> {
  const stepMap = new Map<string, ParsedStep>();
  const worldPointVars = new Map<string, WorldPoint>();

  const setupBody = parseStepsFromMethod(
    source,
    /(?:private|protected|public)?\s+void\s+setupSteps\s*\(\s*\)/,
    stepMap,
    worldPointVars,
    true
  );
  const loadQuestStepsBody = parseStepsFromMethod(
    source,
    /(?:private|protected|public)?\s+void\s+loadQuestSteps\s*\(\s*\)/,
    stepMap,
    worldPointVars,
    true
  );
  const loadBody = parseStepsFromMethod(
    source,
    /(?:private|protected|public)?\s+[^{;]*\bloadSteps\s*\(\s*\)/,
    stepMap,
    worldPointVars,
    false
  );
  const bodyForResolution = `${setupBody}\n${loadQuestStepsBody}\n${loadBody}`;

  // Resolve WorldPoint for steps that lack one.
  // resolveWorldPoint walks addStep chains and falls back to the ConditionalStep's
  // default delegate (arg[1]) recursively, with cycle protection.
  for (const [varName, step] of stepMap) {
    if (step.worldpoint !== undefined) continue;
    const wp = resolveWorldPoint(varName, stepMap, bodyForResolution, new Set());
    if (wp) step.worldpoint = wp;
  }

  return stepMap;
}

// ─── getPanels parser ─────────────────────────────────────────────────────────

function parsePanels(source: string): { panelTitle: string; stepVars: string[] }[] {
  const body = extractMethodBody(
    source,
    /(?:private|protected|public)?\s+[^{;]*\bgetPanels\s*\(\s*\)/
  );
  if (!body) return [];

  const cleaned = stripCommentsAndStrings(body);
  const listVarMap = new Map<string, string[]>();
  const listDeclPattern =
    /(?:final\s+)?(?:List(?:\s*<[^>]+>)?|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:List\.of|Arrays\.asList|Collections\.singletonList)\s*\(/g;
  let listDeclMatch: RegExpExecArray | null;
  while ((listDeclMatch = listDeclPattern.exec(cleaned)) !== null) {
    const listVarName = listDeclMatch[1];
    const listOpen = listDeclMatch.index + listDeclMatch[0].length - 1;
    const listClose = findMatchingClose(cleaned, listOpen, "(", ")");
    if (listClose === -1) continue;
    const entriesRaw = body.slice(listOpen + 1, listClose);
    const entries = splitTopLevelArgs(entriesRaw)
      .map((token) => {
        const tokenCleaned = stripCommentsAndStrings(token).trim();
        if (!tokenCleaned) return undefined;
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tokenCleaned)) return tokenCleaned;
        if (tokenCleaned.startsWith("new ")) {
          const idx = stripCommentsAndStrings(token).indexOf("new ");
          return idx >= 0 ? token.slice(idx).trim() : token.trim();
        }
        return undefined;
      })
      .filter((s): s is string => s !== undefined);
    listVarMap.set(listVarName, entries);
  }
  const results: { panelTitle: string; stepVars: string[] }[] = [];
  const pattern = /new\s+PanelDetails\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleaned)) !== null) {
    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingClose(cleaned, openParen, "(", ")");
    if (closeParen === -1) continue;

    const argsRaw = body.slice(openParen + 1, closeParen);
    const rawArgs = splitTopLevelArgs(argsRaw);

    const panelTitle = extractStringArg(rawArgs[0] ?? "");

    // arg[1] is the steps list; arg[2]+ are item/skill requirements (ignored)
    const secondArg = (rawArgs[1] ?? "").trim();
    const listMatch = secondArg.match(
      /^(?:List\.of|Arrays\.asList|Collections\.singletonList)\s*\(/
    );

    let stepVars: string[] = [];
    if (listMatch) {
      const listOpenIdx = secondArg.indexOf("(");
      const listCloseIdx = findMatchingClose(secondArg, listOpenIdx, "(", ")");
      if (listCloseIdx !== -1) {
        stepVars = splitTopLevelArgs(secondArg.slice(listOpenIdx + 1, listCloseIdx))
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(secondArg) && listVarMap.has(secondArg)) {
      stepVars = listVarMap.get(secondArg) ?? [];
    } else if (secondArg) {
      stepVars = [secondArg];
    }

    stepVars = stepVars
      .map((token) => {
        const tokenCleaned = stripCommentsAndStrings(token).trim();
        if (!tokenCleaned) return undefined;
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tokenCleaned)) return tokenCleaned;
        if (tokenCleaned.startsWith("new ")) {
          const idx = stripCommentsAndStrings(token).indexOf("new ");
          return idx >= 0 ? token.slice(idx).trim() : token.trim();
        }
        return undefined;
      })
      .filter((s): s is string => s !== undefined);

    results.push({ panelTitle, stepVars });
  }

  return results;
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

/** Internal panel during parsing; maps to QuestPanel for output. */
/** Internal step during parsing; uses same field names as QuestStep. */
interface ParsedStep {
  description: string;
  worldpoint?: WorldPoint;
}
interface ParsedPanel {
  panelTitle: string;
  steps: (ParsedStep & { varName: string })[];
}

function buildPanels(source: string): ParsedPanel[] {
  const stepMap = parseAllSteps(source);
  const panelDefs = parsePanels(source);

  return panelDefs.map(({ panelTitle, stepVars }) => ({
    panelTitle,
    steps: stepVars.map((varName) => {
      const cleanedVar = stripCommentsAndStrings(varName).trim();
      const inlineMatch = cleanedVar.match(/^new\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (inlineMatch) {
        const constructorName = inlineMatch[1];
        const openParen = varName.indexOf("(");
        const closeParen = findMatchingClose(varName, openParen, "(", ")");
        if (openParen !== -1 && closeParen !== -1) {
          const argsRaw = varName.slice(openParen + 1, closeParen);
          return {
            varName,
            ...parseStepConstructor(constructorName, argsRaw, new Map<string, WorldPoint>()),
          };
        }
      }
      const step = stepMap.get(varName);
      if (!step) return { varName, description: "STEP NOT FOUND IN setupSteps" };
      return { varName, ...step };
    }),
  }));
}

/**
 * Convert parsed panels to QuestData. Steps are populated from parsed data;
 * other fields are optional with empty defaults.
 */
function toQuestData(questName: string, panels: ParsedPanel[]): QuestData {
  const steps: QuestPanel[] = panels.map((panel) => ({
    panelName: panel.panelTitle,
    steps: panel.steps.map((s): RawStep => ({
      description: s.description,
      ...(s.worldpoint !== undefined ? { worldpoint: s.worldpoint } : {}),
    })),
  }));

  return {
    name: questName,
    questPoints: 0,
    experienceRewards: [],
    lampRewards: null,
    skillRequirements: [],
    questRequirements: [],
    questPointRequirement: null,
    itemRequirements: [],
    steps,
    activeStep: 0,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const approvedQuests = loadApprovedQuests();

  if (approvedQuests.length === 0) {
    console.error("No approved quests found in approved-quests.json");
    process.exit(1);
  }

  fs.mkdirSync(QUESTS_OUTPUT_DIR, { recursive: true });

  for (const questName of approvedQuests) {
    const questPath = questNameToPath(questName);
    try {
      const source = await fetchQuestFile(questPath);
      const panels = buildPanels(source);

      if (panels.length === 0) {
        console.log("No panels found.");
        continue;
      }

      const questData = toQuestData(questName, panels);
      const filename = `${questNameToCamelCase(questName)}.json`;
      const outputPath = path.join(QUESTS_OUTPUT_DIR, filename);
      fs.writeFileSync(outputPath, JSON.stringify(questData, null, 2), "utf-8");
      console.log(`Wrote: ${outputPath}`);
    } catch (err) {
      console.error(`Failed to process ${questName}:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
