import { create } from "zustand";

interface MapVisibilityState {
  showMapLabels: boolean;
  showMapIcons: boolean;
  actions: {
    setShowMapLabels: (show: boolean) => void;
    setShowMapIcons: (show: boolean) => void;
  };
}

export const useMapVisibilityStore = create<MapVisibilityState>((set) => ({
  showMapLabels: true,
  showMapIcons: true,
  actions: {
    setShowMapLabels: (showMapLabels) => set({ showMapLabels }),
    setShowMapIcons: (showMapIcons) => set({ showMapIcons }),
  },
}));

export const useShowMapLabels = () =>
  useMapVisibilityStore((state) => state.showMapLabels);

export const useShowMapIcons = () =>
  useMapVisibilityStore((state) => state.showMapIcons);

export const useMapVisibilityActions = () =>
  useMapVisibilityStore((state) => state.actions);
