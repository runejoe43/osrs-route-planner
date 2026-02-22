/**
 * Build-time script: fetches OSRS Wiki NPC_IDs and Item_IDs pages via MediaWiki API,
 * parses the table on each page into name -> numeric IDs, and writes JSON to public/data/.
 * Run: npm run build:data or npx tsx scripts/parse-wiki-ids.ts
 */

import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";

const WIKI_API = "https://oldschool.runescape.wiki/api.php";
const USER_AGENT = "osrs-route-builder/1.0 (https://github.com/your-repo/osrs-route-builder)";

type NameToIds = Record<string, number[]>;

async function fetchWikiPage(page: string): Promise<string> {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&origin=*`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Wiki API error: ${res.status} ${res.statusText} for page ${page}`);
  }
  const data = (await res.json()) as { parse?: { text?: { "*"?: string } } };
  const html = data.parse?.text?.["*"];
  if (typeof html !== "string") {
    throw new Error(`No text in parse response for page ${page}`);
  }
  return html;
}

/** Extract display name: first column text, split on # and use only [0], trimmed. */
function parseName(rawName: string): string {
  return rawName.split("#")[0].trim();
}

/** Extract only numeric IDs from the second column (links with id=N). Non-numeric IDs are ignored. */
function parseIdsFromCell(
  $: ReturnType<typeof load>,
  cell: ReturnType<ReturnType<typeof load>>
): number[] {
  const ids: number[] = [];
  cell.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const match = href.match(/[?&]id=([^&]+)/);
    if (match) {
      const value = match[1];
      if (/^\d+$/.test(value)) {
        ids.push(parseInt(value, 10));
      }
    }
  });
  return ids;
}

/**
 * Parse wiki HTML table into Map<string, number[]>.
 * - Name = first column text, split("#")[0].trim().
 * - Only numeric IDs from second column are kept.
 * - Name is only added when the row has at least one numeric ID.
 * - Empty name after trim/split: log rawName and skip row.
 */
function parseWikiTable(html: string): NameToIds {
  const $ = load(html);
  const out: NameToIds = {};

  const tables = $("table.wikitable");
  if (tables.length === 0) {
    throw new Error("No table.wikitable found in page");
  }
  const table = tables.first();
  const rows = table.find("tbody tr").toArray();

  for (const tr of rows) {
    const cells = $(tr).find("td").toArray();
    if (cells.length < 2) continue;

    const rawName = $(cells[0]).text().trim();
    const name = parseName(rawName);

    if (!name) {
      console.warn("[parse-wiki-ids] Empty name after split/trim, skipping. rawName:", JSON.stringify(rawName));
      continue;
    }

    const numericIds = parseIdsFromCell($, $(cells[1]));

    if (numericIds.length === 0) {
      continue;
    }

    if (!out[name]) {
      out[name] = [];
    }
    const existing = new Set(out[name]);
    for (const id of numericIds) {
      if (!existing.has(id)) {
        existing.add(id);
        out[name].push(id);
      }
    }
  }

  return out;
}

function writeJson(dir: string, filename: string, data: NameToIds): void {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0), "utf-8");
  console.log(`Wrote ${filePath}`);
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", "data");

  try {
    console.log("Fetching NPC_IDs...");
    const npcHtml = await fetchWikiPage("NPC_IDs");
    const npcs = parseWikiTable(npcHtml);
    writeJson(outDir, "npcs-summary.json", npcs);

    console.log("Fetching Item_IDs...");
    const itemHtml = await fetchWikiPage("Item_IDs");
    const items = parseWikiTable(itemHtml);
    writeJson(outDir, "items-summary.json", items);

    console.log("Done.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
