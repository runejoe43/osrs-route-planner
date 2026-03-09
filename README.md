# OSRS Route Builder

## Overview

### Objective

A web app that renders the OSRS world map and surfaces various in-game activities — quests, achievement diaries, and other tasks — directly on the map. Users can build a personalised route through those activities that can then be exported and imported into RuneLite for visual in-game guidance.

### High Level Goals

1. **Show OSRS map via Leaflet** with scrolling, world map icons, and labels ✅
2. **Extract quest steps and coordinates** from `Quest Helper` and render them on the map 🔄
3. **Extract or build Diary coordinates** and render them on the map
4. **Add an interface for other steps** — bosses, combat achievements, clues, and collection log entries
5. **Add a route builder** where all steps can be added, reordered, and exported
6. **RuneLite integration** *(stretch goal)*

---

## Data Sources


| Data                                                                                         | Source                                                                                                                      | Access Method                                                                                                                    | Notes                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OSRS map tiles                                                                               | JoeGandy/RSMap                                                                                                              | Fetched in browser via Leaflet                                                                                                   | Static tile hosting at joegandy.github.io/RSMap; pre-generated from game cache, no auth needed                                                                                     |
| WorldPoint coordinate math                                                                   | Jagex native tile grid                                                                                                      | Pure arithmetic in JS                                                                                                            | Linear fitting from five reference points (least-squares calibration); reference points are listed in the table below. Same system used by RuneLite, Explv's Map, and Quest Helper |
| NPC, Object, and Item IDs + names                                                            | OSRS Wiki [NPC_IDs](https://oldschool.runescape.wiki/w/NPC_IDs) and [Item_IDs](https://oldschool.runescape.wiki/w/Item_IDs) | Build-time script fetches wiki pages via MediaWiki API, parses the main table on each page, writes to `/public/data/`            | Name taken from first column (split on `#`, use first segment); only numeric IDs kept; output is `npcs-summary.json` and `items-summary.json`. Object IDs out of scope for now.    |
| Quest metadata + step coordinates (requirements, rewards, panels, WorldPoints, instructions) | [Quest Helper](https://github.com/Zoinkwiz/quest-helper) Java source                                                        | Build-time script `scripts/parse-quest-helper.ts` fetches raw Java from GitHub, parses methods, writes to `/public/data/quests/` | Approved quests listed in `scripts/approved-quests.json`; one JSON file per quest (`<slug>.json`). Run `npm run build:quests`.                                                     |


### Coordinate calibration reference points


| POI                       | Leaflet (lat, lng)      | Expected WorldPoint (x, y) | Notes            |
| ------------------------- | ----------------------- | -------------------------- | ---------------- |
| Lumbridge castle kitchen  | [-1174.2476, 280.9303]  | [3206, 3214]               |                  |
| Varrock courtyard         | [-1147.421875, 281.625] | [3212, 3428]               |                  |
| Center of Ardougne market | [-1162.78125, 212.625]  | [2661, 3305]               |                  |
| Wintertodt door           | [-1080.375, 83.8125]    | [1630, 3965]               | Far west of map  |
| Weiss Salt Mine           | [-283.65625, 236.46875] | [2851, 10338]              | Far north of map |


## Tech Stack

### Core

- **React + TypeScript** — component framework
- **Vite** — build tooling and dev server
- **Zustand** — client-side state management for map state, route steps, and loaded data

### Map Rendering

- **Leaflet.js** with `CRS.Simple` — renders tiled maps without geographic projection; pixel coordinates map directly to OSRS tile coordinates
- **react-leaflet** — React bindings for Leaflet

### Data Fetching & Parsing

- **Native `fetch()`** — sufficient for all external data sources (static JSON in `/public/data/`, Wiki API); no dedicated HTTP client library needed
- **A wikitext parser** (e.g. `wtf_wikipedia` npm package) — for parsing `{{QuestDetails}}` infobox fields from the Wiki MediaWiki API response

### Export / Sharing

- `**file-saver`** or native `Blob` API — for exporting route files
- URL state encoding (base64 or query params) — for shareable route links without a backend

---

## Task List

### Data Preparation

1. ~~Write a build-time script that fetches the OSRS Wiki [NPC_IDs](https://oldschool.runescape.wiki/w/NPC_IDs) and [Item_IDs](https://oldschool.runescape.wiki/w/Item_IDs) pages via the MediaWiki API, parses the main table on each page (name = first column split on `#` using only the first segment; only numeric IDs from the second column), and writes `npcs-summary.json` and `items-summary.json` into `/public/data/`. Object IDs are out of scope for now. Run with `npm run build:data` or as part of `npm run build`.~~
2. ~~Write a Java-source parser (Node script) that reads Quest Helper quest files and extracts details such as rewards, requirements, and `WorldPoint` into structured JSON files — one per quest.~~
3. ~~Verify the extracted quest step coordinates against Explv's Map to confirm accuracy before committing the JSON.~~
4. Generate a `quest-index.json` manifest listing all available pre-loaded quests (name, filename, and quest point value) so the quest picker UI can populate without hardcoding quest names.
5. Define and document the canonical JSON schema for a Route file — covering `WorldPoint`, step type enum, entity ID, instruction text, and optional metadata — so that the parser output, the Zustand store shape, and the export format all stay in sync from the start.

### Project Setup

1. ~~Scaffold the project with `npm create vite@latest` using the React + TypeScript template and install core dependencies (react-leaflet, leaflet, zustand, wtf_wikipedia, file-saver).~~
2. ~~Configure Vite to serve static data files from `/public/data/` and set up TypeScript path aliases.~~
3. Define shared TypeScript types for `WorldPoint`, `RouteStep`, `StepType`, `EntityRef`, and the top-level `Route` object. Centralising these early prevents type drift between the store, the map layer, and the export serialiser.
4. ~~Configure the `User-Agent` header for all OSRS Wiki API calls (required by their usage guidelines). Create a thin `wikiApi.ts` wrapper around `fetch()` that injects this header so it is never forgotten on individual call sites.~~

### Map Foundation

1. ~~Implement the Leaflet map component with `CRS.Simple`, OSRS tile layers, and plane switching controls.~~
2. ~~Implement the `WorldPoint` coordinate math — a utility function that converts Leaflet `latlng` pixel offsets to `{ x, y, plane }` integers.~~
3. ~~Add a coordinate display overlay that shows the current hovered `WorldPoint` in real time.~~
4. Implement step pin rendering — for each `RouteStep` in the current route, place a numbered Leaflet `Marker` at the correct pixel position. Markers should update reactively when steps are added, reordered, or deleted, and should only be visible when their plane matches the current active plane.
5. Wire up Leaflet click events to the step placement flow: a map click should compute the `WorldPoint`, write a draft step to the store, and open the step editor panel — keeping map interaction and UI state cleanly separated.

### State & Data Layer

1. Define Zustand store slices: map state (current plane, viewport), route state (ordered list of steps), and reference data (NPC/object/item lookup tables).
2. Implement data-loading logic that hydrates the NPC, object, and item lookup tables from the static JSON files on app startup.
3. Add loading and error state fields to the reference data store slice so that UI components can show appropriate spinners or fallback messages while the NPC/object/item JSON files are being fetched.

### Step Builder UI

1. Build the step pin placement flow — click map → open step editor panel → fill in type, instruction, and optional entity.
2. Build the entity search component with autocomplete backed by the in-memory reference data lookup tables (NPC/object/item).
3. Build the step list sidebar showing all route steps in order with edit and reorder controls.
4. Implement drag-and-drop reordering of steps in the sidebar (e.g. using `@dnd-kit/sortable`). Reordering must update step indices in the store and re-number the corresponding map markers atomically.
5. Implement route import — allow users to load a previously exported route JSON file back into the app, validating it against the canonical schema before writing it to the store.

### Quest Integration

1. Implement the Wiki metadata fetch — given a quest name, call the MediaWiki API section 0 endpoint and parse the infobox fields for display.
2. Build the pre-loaded quest picker that imports extracted Quest Helper JSON as a starting route.
3. Integrate the OSRS Wiki Weird Gloop API for item enrichment — when an item is attached to a step, fetch and display its current Grand Exchange price and any other relevant metadata alongside the step.

### Export & Sharing

1. Implement the JSON export function that serialises the current Zustand route state into the Quest Helper-compatible schema and triggers a file download.
2. Implement URL-based route sharing — serialise route state to a compressed base64 query param and restore from URL on load.

### Polish

1. Add map tile caching headers and loading states for the data fetch calls.
2. Write basic end-to-end tests covering coordinate math, entity search, and route export output.

---

## Tool Usage

### OSRS Wiki NPC and Item ID tables (`scripts/parse-wiki-ids.ts`)

A standalone TypeScript script fetches the OSRS Wiki [NPC_IDs](https://oldschool.runescape.wiki/w/NPC_IDs) and [Item_IDs](https://oldschool.runescape.wiki/w/Item_IDs) pages and writes name-to-IDs JSON to `public/data/`. It runs at build time and is not shipped to the browser.

**How the data is obtained.** The script calls the MediaWiki API (`action=parse&page=<PAGE>&prop=text&format=json`) for each page, which returns the fully rendered HTML of the page.

**How it's parsed.** [Cheerio](https://cheerio.js.org/) (a server-side jQuery-like HTML parser, devDependency only) loads the rendered HTML and selects the first `table.wikitable`. For each `tbody tr` row:
- **Name** — column 0 text, split on `#` and trimmed (so `Name#Variant` becomes `Name`).
- **IDs** — extracted from `?id=N` query params on `<a>` links in column 1; only purely numeric values are kept (`hist6479`, `interface8036`, etc. are discarded).
- Rows with an empty name or no numeric IDs are skipped. Rows sharing a display name are merged into a single key with deduplicated IDs.

**Output format.** `Record<string, number[]>` — display name → array of numeric IDs. Written (compact, no indentation) to `public/data/npcs-summary.json` and `public/data/items-summary.json`.

**How to run.** `npm run build:data` or `npx tsx scripts/parse-wiki-ids.ts`

**User-Agent.** All OSRS Wiki API requests include a `User-Agent` header as required by their usage guidelines.

---

### Quest Helper parser (`scripts/parse-quest-helper.ts`)

A build-time Node script that fetches raw Java source from the [zoinkwiz/quest-helper](https://github.com/Zoinkwiz/quest-helper) repo and extracts quest steps and coordinates into JSON. Run with `npm run build:quests`.

**Input.** `scripts/approved-quests.json` — a `Record<string, boolean>` allowlist. Only quests set to `true` are processed.

**Source fetching.** Files are pulled from `raw.githubusercontent.com` using two naming conventions: `camelCaseFolder/PascalCaseFile.java`.

**Parsing pipeline** (pure string/regex — no Java AST):
1. **`stripCommentsAndStrings()`** — blanks out `//` and `/* */` comments and string literal contents while preserving character indices.
2. **`extractMethodBody()`** — finds a target method by regex and extracts its body using brace-depth tracking.
3. **`parseAllSteps()`** — scans `setupSteps()` and `loadQuestSteps()` for `WorldPoint` variable declarations and step constructors (`NpcStep`, `ObjectStep`, `ConditionalStep`, `DetailedQuestStep`, etc.), then resolves descriptions and WorldPoints per step type. Steps without a direct WorldPoint walk their `addStep()` chains to inherit one from a sub-step.
4. **`parsePanels()`** — reads `getPanels()` for `PanelDetails` calls and resolves their step variable lists.
5. **`buildPanels()` / `toQuestData()`** — assembles the final `QuestData` shape with panels → steps.

**Output.** One JSON file per quest in `public/data/quests/` (e.g. `treeGnomeVillage.json`) shaped as `QuestData` with `panels[].steps[]` each containing `description` and an optional `worldpoint`.

---

### Leaflet.js and react-leaflet (`src/components/map/OSRSMap.tsx`)

Leaflet is used with `CRS.Simple` — a flat tile grid with no geographic projection. Tiles are served from **JoeGandy/RSMap** at `https://joegandy.github.io/RSMap/tiles/0/{z}/{x}/{y}.png`.

**MapContainer configuration:**
- `crs={L.CRS.Simple}`, `bounds={new LatLngBounds([0, 0], [-1428, 405])}`, `center={[-1173, 273]}`
- `zoom={4}`, `minZoom={1}`, `maxZoom={6}`, `maxBoundsViscosity={1.0}`
- `zoomControl={false}`, `attributionControl={false}`

**TileLayer:** `tileSize={256}`, `noWrap={true}`, `tms={true}` (Y-axis flip for TMS row indexing). The plane is currently hardcoded to `0` in the tile URL path; plane switching is not yet implemented.

**Map events** are handled in dedicated child components using react-leaflet hooks — never in `OSRSMap` itself:
- `useMapEvents({ mousemove })` in `CoordViewer` — converts `e.latlng` to a `WorldPoint` via `leafletToWorldPoint` and writes it to `coordStore`.
- `eventHandlers={{ click }}` on individual `<Marker>` elements (e.g. `QuestPin`) — handles per-pin interactions.
- `useMap()` in `WorldMapIcons`, `WorldMapLabels`, and `MapAutoPan` — listens to `zoomend` or calls `map.panTo(...)`.

**Coordinate conversion** (`src/util/Coordinates.tsx`) uses a **five-point least-squares linear fit**. The `CAL_POINTS` array pairs known Leaflet (lat, lng) values with their OSRS `WorldPoint`; `linearFit()` derives `scale` and `offset` per axis at module load. `leafletToWorldPoint(lat, lng, plane)` and `worldPointToLeaflet(wp)` apply these. If the tile source or bounds ever change, update `CAL_POINTS` and cross-check against the calibration table in the Data Sources section or [Explv's Map](https://explv.github.io).

---

### Zustand stores (`src/stores/`)

The app uses four separate stores rather than one monolithic store. Actions are grouped into a nested `actions` object inside each store and exposed via dedicated selector hooks, so consumers never accidentally subscribe to the whole store.

| Store | File | State |
| --- | --- | --- |
| `coordStore` | `coordStore.ts` | `coords: WorldPoint` — current mouse position on the map (updated on `mousemove` by `CoordViewer`) |
| `routeStore` | `routeStore.ts` | `route: Step[]` — ordered list of user-added waypoints |
| `mapVisibilityStore` | `mapVisibilityStore.ts` | `showMapLabels`, `showMapIcons` — toggles for overlay layers |
| `questStore` | `questStore.ts` | `quests: Record<string, StoredQuest>`, `selectedQuestId` — loaded quests and active step tracking |

**`questStore` detail.** `StoredQuest` extends `QuestData` with a pre-flattened `flatSteps: QuestStep[]` array (built at `addQuest` time). `useActiveStep(questId)` walks backwards through `flatSteps` when the active step has no `WorldPoint`, returning the nearest prior step that does — so the map always has a position to pan to.

**Selector pattern.** Every component subscribes to exactly the slice it needs. Arrays and objects use `useShallow` to avoid re-renders from new references with identical contents:

```ts
// primitive — no shallow needed
const selectedQuestId = useSelectedQuestId();

// array — use useShallow
const questIds = useQuestIds(); // internally: useQuestStore(s => Object.keys(s.quests), useShallow)

// actions are never reactive — just call the hook once
const { addQuest, advanceStep } = useQuestActions();
```

## CIP List
1. Last step in a quest won't complete, likely due to no step to update active step to
2. MapAutoPan could potentially be re-rendering too many times
3. ~~Some quests aren't meant to be sequential, e.g. Dragon Slayer I you can get map pieces or the shield in any order, forcing users into a specific order limits flexibility (any way to tell this via quest helper?)~~
   1. This was addressed by making all panels doable in parallel
4. info hover in draggableBox doesn't work, likely blocked by useDraggable
5. hooks/useDeleteStep.ts
  1. 1not a component but I notice the hook uses useQuestStore(s => s.quests) but only needs a single quest, should update store actions to give a single quest provider so we don't need to over subscribe
6. overlay/
  1. move the overlay components into this dir