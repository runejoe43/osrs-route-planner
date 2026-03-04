import { create } from "zustand";
import { leafletToWorldPoint, type WorldPoint } from "../util/Coordinates";

interface CoordStoreState {
  coords: WorldPoint;
  actions: {
    setCoords: (raw: L.LatLng) => void;
  };
}

export const useCoordStore = create<CoordStoreState>((set) => ({
  coords: { x: 0, y: 0, plane: 0 },
  actions: {
    setCoords: (raw) => set({ coords: leafletToWorldPoint(raw.lat, raw.lng, 0) }),
  },
}));

export const useCoords = () => useCoordStore((state) => state.coords);
export const useCoordsStoreActions = () => useCoordStore((state) => state.actions);