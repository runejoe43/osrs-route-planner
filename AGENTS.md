# Agent guidance

## Tests

Manual validation for **coordinate conversion (Leaflet ↔ WorldPoint)**. Use the map click handler: each click logs `leaflet: { lat, lng }` and `worldPoint: { x, y, plane }` to the console. Compare with Explv’s map (explv.github.io) for the same spots.

**How to validate:** Open the app, open Chrome DevTools → Console, click on each POI on the map, and confirm the logged `worldPoint` matches the expected coordinates below (within ±1 tile is acceptable for clicking).

| POI | Leaflet (lat, long) | Expected WorldPoint (x, y) | Notes |
|-----|---|----------------------------|--------|
| Lumbridge castle kitchen | [-1174.2476, 280.9303] | [3206, 3214] | Reference point; map is centered near here. |
| Varrock courtyard | [-1147.421875, 281.625] | [3212, 3428] | North of Lumbridge. |
| Center of Ardougne market | [-1162.78125, 212.625] | [2661, 3305] | West of center. |
| Wintertodt door | [-1080.375, 83.8125] | [1630, 3965] | North of visible map; may be off-bounds (lat &lt; -1428). |
| Weiss Salt Mine | [-283.65625, 236.46875] | [2851, 10338] | Far north of map |

**Reference:** Explv’s map (explv.github.io) uses the same RuneLite/Quest Helper WorldPoint system; use it to confirm expected (x, y) for each location.

**Chrome DevTools validation:** Open the app, DevTools → Console, click the map. Each click logs `Map click: { leaflet: { lat, lng }, worldPoint: { x, y, plane } }`. Verified: click at map center (Lumbridge) yields `worldPoint: { x: 3206, y: 3214, plane: 0 }` (Lumbridge castle kitchen). Manually click Varrock, Ardougne, and (if visible) Wintertodt and confirm the logged WorldPoint matches the table above.

**Calibration:** Conversion uses five-point least-squares calibration (Lumbridge, Varrock, Ardougne, Wintertodt, Weiss Salt Mine). If the tile source or map bounds change, re-click all five POIs, read `leaflet: { lat, lng }` from the console, and update the `CAL_POINTS` array in `src/util/Coordinates.tsx` (scale/offset are derived at module load); then re-verify.
