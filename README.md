# OSRS Route Builder

## App Description

A web app that renders the Old School RuneScape world map and allows users to plan routes through the game. Users can place pins tied to the native OSRS coordinate system, attach NPCs, objects, and items to each step, and compose multi-step routes or quest walkthroughs. The app draws on existing quest step data from Quest Helper and metadata from the OSRS Wiki to pre-populate known quests and diary steps.

The end goal is a shareable, exportable route that can be imported into RuneLite — either directly into the Quest Helper plugin or a complementary plugin — to guide a player through their planned route in-game with on-screen arrows and tile highlights.

---

## Data Sources


| Data                                                            | Source                                                                   | Access Method                                                                             | Notes                                                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OSRS map tiles                                                  | JoeGandy/RSMap                                                           | Fetched in browser via Leaflet                                                            | Static tile hosting at joegandy.github.io/RSMap; pre-generated from game cache, no auth needed                                                                                     |
| WorldPoint coordinate math                                      | Jagex native tile grid                                                   | Pure arithmetic in JS                                                                     | Linear fitting from five reference points (least-squares calibration); reference points are listed in the table below. Same system used by RuneLite, Explv's Map, and Quest Helper |
| NPC, Object, and Item IDs + names                               | OSRS Wiki [NPC_IDs](https://oldschool.runescape.wiki/w/NPC_IDs) and [Item_IDs](https://oldschool.runescape.wiki/w/Item_IDs) | Build-time script fetches wiki pages via MediaWiki API, parses the main table on each page, writes to `/public/data/` | Name taken from first column (split on `#`, use first segment); only numeric IDs kept; output is `npcs-summary.json` and `items-summary.json`. Object IDs out of scope for now. |
| Quest metadata (requirements, difficulty, quest points, length) | OSRS Wiki MediaWiki API                                                  | Public REST API, no auth required                                                         | Parsed from `{{QuestDetails}}` infobox in section 0 of each quest page                                                                                                             |
| Quest step coordinates + instructions                           | Quest Helper GitHub source (`WaterfallQuest.java` etc.)                  | Parse Java source from public repo                                                        | No pre-built data resource exists; must extract and convert to JSON                                                                                                                |
| Grand Exchange pricing + general game data                      | OSRS Wiki Weird Gloop API                                                | Public REST API                                                                           | Structured and clean; useful for item enrichment                                                                                                                                   |
| Player quest completion status                                  | WikiSync API                                                             | **Off limits** for third-party use                                                        | Wiki internal use only — do not use                                                                                                                                                |


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

## Features

### Interactive OSRS Map

Display the full OSRS world map in the browser using Leaflet and community map tiles. Support plane switching (surface, underground levels) and show the current tile coordinate (`WorldPoint x, y, plane`) as the user hovers.

### Coordinate-Pinned Steps

Allow users to click the map to place a step pin. Each pin is stored with its native OSRS `WorldPoint` and can be annotated with a step type (Talk To, Use Object, Walk To, etc.), a text instruction, and an optional NPC, object, or item attachment.

### NPC / Object / Item Attachment

Searchable dropdowns populated from the JSON in `/public/data/` (generated from OSRS Wiki NPC_IDs and Item_IDs tables) let users attach a named, ID-backed entity to each step — matching exactly how Quest Helper's `NpcStep` and `ObjectStep` reference `NpcID` and `ObjectID` constants.

### Pre-loaded Quest Steps

Known quests (e.g. Waterfall Quest) can be pre-loaded as pin sequences extracted from Quest Helper's source. These serve as read-only reference routes or starting points for customisation.

### Quest Metadata Display

For any official quest, display the Wiki infobox metadata (requirements, difficulty, length, rewards) alongside the route steps, fetched live from the OSRS Wiki MediaWiki API.

### Route Export

Export a completed route as a structured JSON file whose schema mirrors what Quest Helper expects — `WorldPoint`, step type, entity ID, and instruction text per step. This file could be imported into a companion RuneLite plugin or used as a Quest Helper data source.

### Route Sharing via URL

Encode the current route into the URL (compressed query param or hash) so users can share a link that restores the exact route state without requiring a backend or user accounts.

---

## Task List

### Data Preparation

1. Write a build-time script that fetches `ItemID.java`, `NpcID.java`, and `ObjectID.java` from runelite/runelite (runelite-api/gameval), parses each to extract id and display name, and writes `npcs-summary.json`, `objects-summary.json`, and `items-summary.json` into `/public/data/`. Each constant in the gameval files has a Javadoc comment immediately above it (e.g. `/** \n * Crate \n */` before `public static final int MCANNONCRATEBOY = 1;`) — parse that comment for the human-readable name so the JSON has in-game-style names for autocomplete.
2. Write a Java-source parser (Node script) that reads Quest Helper quest files and extracts `WorldPoint`, step type, entity ID, and instruction text into structured JSON files — one per quest.
3. Verify the extracted quest step coordinates against Explv's Map to confirm accuracy before committing the JSON.
4. Generate a `quest-index.json` manifest listing all available pre-loaded quests (name, filename, and quest point value) so the quest picker UI can populate without hardcoding quest names.
5. Define and document the canonical JSON schema for a Route file — covering `WorldPoint`, step type enum, entity ID, instruction text, and optional metadata — so that the parser output, the Zustand store shape, and the export format all stay in sync from the start.

### Project Setup

1. Scaffold the project with `npm create vite@latest` using the React + TypeScript template and install core dependencies (react-leaflet, leaflet, zustand, wtf_wikipedia, file-saver).
2. Configure Vite to serve static data files from `/public/data/` and set up TypeScript path aliases.
3. Define shared TypeScript types for `WorldPoint`, `RouteStep`, `StepType`, `EntityRef`, and the top-level `Route` object. Centralising these early prevents type drift between the store, the map layer, and the export serialiser.
4. Configure the `User-Agent` header for all OSRS Wiki API calls (required by their usage guidelines). Create a thin `wikiApi.ts` wrapper around `fetch()` that injects this header so it is never forgotten on individual call sites.

### Map Foundation

1. ~~Implement the Leaflet map component with `CRS.Simple`, OSRS tile layers, and plane switching controls.~~
2. ~~Implement the `WorldPoint` coordinate math — a utility function that converts Leaflet `latlng` pixel offsets to `{ x, y, plane }` integers.~~
3. Add a coordinate display overlay that shows the current hovered `WorldPoint` in real time.
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

## Design Decisions

### Backend vs Single-Page App

A backend is not needed for the initial version. All data sources are either static files (NPC/item JSON in `/public/data/` from the wiki ID script, pre-extracted quest step JSON) that can be bundled or served from the `/public` directory, or public APIs (OSRS Wiki) that can be called directly from the browser. Zustand handles all runtime state, and route export/sharing works entirely client-side via file download and URL encoding.

The case for adding a backend later would be route persistence (saving named routes to a user account), community sharing (a gallery of public routes), or if the RuneLite GitHub source or your static data becomes unavailable and you want to self-host the entity ID data behind your own API. For now, a fully static SPA deployed to GitHub Pages or Vercel covers all the described features without any server infrastructure.

The one CORS caveat: the OSRS Wiki MediaWiki API must be called with an appropriate `User-Agent` header per their guidelines. This is possible from the browser but if they ever restrict cross-origin requests, a lightweight serverless function (Vercel Edge Function or Cloudflare Worker) acting as a proxy would be the minimal addition needed — not a full backend.

---

## Tool Usage

### OSRS Wiki NPC and Item ID tables

A standalone TypeScript script fetches the OSRS Wiki [NPC_IDs](https://oldschool.runescape.wiki/w/NPC_IDs) and [Item_IDs](https://oldschool.runescape.wiki/w/Item_IDs) pages and writes name-to-IDs JSON to `public/data/`.

**How the data is obtained.** The script calls the MediaWiki API (`action=parse&page=<PAGE>&prop=text&format=json`) for each page, then parses the main HTML table on the page.

**How it's parsed.** One reusable parser handles both pages. Each table row has a name (first column) and one or more IDs (second column). The **name** is the first column's text **split on `#`**, using only **`split("#")[0]`** (the part after `#` is ignored so variants like "Name#Banker" and "Name#Pirate" merge under "Name"). **IDs** are taken from links in the second column; **only numeric IDs** are kept (e.g. `hist6479`, `interface8036` are ignored). A name is only added to the output when at least one numeric ID is found for it; rows with no numeric IDs do not create a new key, and invalid IDs on a row are not added to an existing key's list. Rows with the same display name are merged into one key with an array of all numeric IDs.

**Output format.** JSON equivalent to `Map<string, number[]>`: keys = display names (strings), values = arrays of numeric IDs. Written to `public/data/npcs-summary.json` and `public/data/items-summary.json`.

**How to run.** `npm run build:data` or `npx tsx scripts/parse-wiki-ids.ts`

**User-Agent.** All requests to the OSRS Wiki API must send a valid User-Agent header; the script sets this (see `scripts/parse-wiki-ids.ts`).

---

### Leaflet.js and react-leaflet

Use Leaflet with `CRS.Simple` so the map is a flat tile grid with no geographic projection. Tiles are served from **JoeGandy/RSMap** at `https://joegandy.github.io/RSMap/tiles/{plane}/{z}/{x}/{y}.png`. Leaflet requests tiles automatically via the `TileLayer` URL template as the viewport changes.

**React component setup** (see `src/map/OSRSMap.tsx`)

- **MapContainer:** Use `crs={L.CRS.Simple}`, `bounds={new LatLngBounds([0, 0], [-1428, 405])}`, `center={[-1173, 273]}`, `zoom={4}`, `minZoom={1}`, `maxZoom={6}`, and `maxBoundsViscosity={1.0}` so the map matches the RSMap tile extent. Optionally set `zoomControl={false}` and `attributionControl={false}`.
- **TileLayer:** Set `url="https://joegandy.github.io/RSMap/tiles/0/{z}/{x}/{y}.png"` (use `{plane}` in the path for plane switching). Use `tileSize={256}`, `noWrap={true}`, and `tms={true}` (y-axis flip for tile row indexing). Key the layer by plane (e.g. `key="plane-0"`) so react-leaflet remounts when the plane changes.
- **Map events:** Use the `useMapEvents` hook (e.g. `useMapEvents({ click(e) { ... } })`) to get `e.latlng` (lat, lng) on click and pass it to `leafletToWorldPoint(lat, lng, plane)` from `src/util/Coordinates.tsx` to obtain the OSRS `WorldPoint` and log or store it.

**Coordinate conversion** (see `src/util/Coordinates.tsx`)

Conversion between Leaflet (lat, lng) and OSRS WorldPoint (x, y, plane) uses a **five-point least-squares linear fit**: the `CAL_POINTS` array holds Leaflet coordinates and expected WorldPoint for each calibration POI; `linearFit()` computes scale and offset per axis at module load; `leafletToWorldPoint(lat, lng, plane)` and `worldPointToLeaflet(wp)` apply these. Map bounds for RSMap are lng [0, 405], lat [-1428, 0]. If the tile source or bounds change, update `CAL_POINTS` in `Coordinates.tsx` and re-verify using the coordinate calibration reference points table in the Data Sources section; you can also compare clicked WorldPoints to Explv's map (explv.github.io) for the same locations.

---

### Zustand — Granular Store Subscriptions

Zustand stores are plain JavaScript objects. By default, any component that calls `useStore()` re-renders whenever any part of the store changes — which is fine for tiny stores but becomes a problem when the reference data slice holds tens of thousands of NPC/object records and the map is constantly updating hover state.

**The core pattern: always pass a selector.** Never call `useStore()` without a selector. Every component should subscribe to exactly the fields it reads:

```ts
// Bad — re-renders on any store change
const store = useRouteStore();

// Good — re-renders only when `steps` changes
const steps = useRouteStore(s => s.steps);

// Good — re-renders only when the active step index changes
const activeStepIndex = useRouteStore(s => s.activeStepIndex);
```

**Derived/computed values.** If a component needs a value that is computed from store state (e.g. the currently active step object), compute it inside the selector rather than in the component body. Zustand's selector runs on every store update but only triggers a re-render if the returned value changed (by reference equality):

```ts
const activeStep = useRouteStore(s => s.steps[s.activeStepIndex] ?? null);
```

**Shallow equality for object and array selectors.** Reference equality breaks for selectors that return a new object or array literal on every call, even if the contents haven't changed. Use Zustand's `shallow` comparator for these cases:

```ts
import { shallow } from 'zustand/shallow';

// Without shallow, this re-renders every time because `{}` is a new reference each call
const { plane, viewport } = useMapStore(
  s => ({ plane: s.plane, viewport: s.viewport }),
  shallow
);
```

**Store slices.** For this app, define three separate stores — `useMapStore`, `useRouteStore`, and `useDataStore` — rather than one monolithic store. This means a component that only cares about the current plane never has to be concerned with what `useDataStore` is doing, and the slices can be reasoned about and tested independently. Each store is created with the standard `create()` call:

```ts
// stores/mapStore.ts
import { create } from 'zustand';

interface MapState {
  plane: number;
  setPlane: (plane: number) => void;
}

export const useMapStore = create<MapState>(set => ({
  plane: 0,
  setPlane: plane => set({ plane }),
}));
```

**The reference data store and large payloads.** The NPC, object, and item tables (potentially 50k+ entries combined) should live in `useDataStore` behind a `Map<number, EntityRef>` keyed by ID. Components doing entity search should never subscribe to the entire map — instead, expose a `getById` action or a `searchByName` utility that operates on the store's data without subscribing the calling component to the store's full contents. For the search autocomplete, run the search in a `useMemo` keyed on the query string rather than re-subscribing the component to the raw data map.

---

### wtf_wikipedia

`wtf_wikipedia` is a wikitext parser that runs in the browser. The OSRS Wiki MediaWiki API returns raw wikitext when you fetch a page's section 0, and the `{{QuestDetails}}` infobox is embedded in that wikitext as a template. `wtf_wikipedia` parses the wikitext into a structured document object, from which you can extract template parameters by name.

**Installation.**

```bash
npm install wtf_wikipedia
```

**Fetching and parsing a quest infobox.** The MediaWiki API endpoint for a section's wikitext is:

```
https://oldschool.runescape.wiki/api.php?action=parse&page=Waterfall%20Quest&prop=wikitext&section=0&format=json&origin=*
```

Pass the returned `wikitext` string to `wtf_wikipedia` and navigate to the infobox template:

```ts
import wtf from 'wtf_wikipedia';

async function fetchQuestDetails(questName: string) {
  const url = `https://oldschool.runescape.wiki/api.php?action=parse&page=${encodeURIComponent(questName)}&prop=wikitext&section=0&format=json&origin=*`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'osrs-route-builder/1.0 (your@email.com)' },
  });
  const data = await res.json();
  const wikitext = data.parse.wikitext['*'];

  const doc = wtf(wikitext);
  const template = doc.template('QuestDetails');

  if (!template) return null;

  return {
    difficulty: template.json().difficulty,
    length:     template.json().length,
    questPoints: template.json().questpoints,
    requirements: template.json().requirements,
    rewards:    template.json().rewards,
  };
}
```

The `template.json()` call returns a flat key/value object corresponding to the named parameters in the wikitext template. Field names match what you see in the raw wikitext (`|difficulty = Intermediate`, etc.), so cross-reference the actual wiki page source if a field isn't appearing.

**Caveats.** `wtf_wikipedia` is a heuristic parser — it handles the common cases well but can trip on heavily nested templates or unusual formatting. The `{{QuestDetails}}` infobox is fairly regular, so coverage should be good. If a field parses as `undefined`, fall back gracefully in the UI rather than crashing. For fields that contain nested wikitext (like the requirements list, which may contain links), call `.text()` on the parsed node to get a plain-text representation.