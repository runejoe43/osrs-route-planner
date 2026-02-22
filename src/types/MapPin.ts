import type { WorldPoint } from "../util/Coordinates";
import type L from "leaflet";

export interface MapPin {
  worldPoint: WorldPoint;
  leafletLatLng: L.LatLng;
}