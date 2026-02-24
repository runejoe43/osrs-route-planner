import L from "leaflet";
import type { MapPin } from "../types/MapPin";
import type { QuestData, WorldPoint } from "../types/QuestData";
import { worldPointToLeaflet } from "./Coordinates";

/**
 * All JSON files in public/data/quests are treated as quest data.
 * Vite discovers them at build time via import.meta.glob.
 */
const questModules = import.meta.glob<{ default: QuestData }>(
  "../../public/data/quests/*.json",
  { eager: false }
);

/**
 * Extracts all world points from a quest's steps (all panels, all steps).
 */
function extractWorldPoints(quest: QuestData) {
  const points: Array<{ worldPoint: WorldPoint; description: string }> = [];
  for (const panel of quest.steps) {
    for (const step of panel.steps) {
      if (step.worldpoint) {
        let wp = step.worldpoint as WorldPoint;
        points.push({worldPoint: wp, description: step.stepDescription});
      }
    }
  }
  return points;
}

/**
 * Converts a quest WorldPoint (x, y, plane) to a MapPin (worldPoint + leafletLatLng).
 */
function worldPointToMapPin(
  input: { worldPoint: WorldPoint; description: string }
): MapPin {
  const coords = worldPointToLeaflet(input.worldPoint);
  return {
    worldPoint: { x: input.worldPoint.x, y: input.worldPoint.y, plane: input.worldPoint.plane },
    leafletLatLng: L.latLng(coords.lat, coords.lng),
    description: input.description,
  };
}

/**
 * Reads all quest JSON files from public/data/quests (discovered via glob),
 * collects every step world point, and returns an array of MapPin for the OSRSMap markers state.
 */
export async function loadQuestMarkers(): Promise<MapPin[]> {
  const loaders = Object.values(questModules);
  const results = await Promise.all(
    loaders.map(async (load) => {
      const mod = await load();
      const quest = mod.default;
      return extractWorldPoints(quest).map(worldPointToMapPin);
    })
  );
  return results.flat();
}
