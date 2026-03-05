import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Step } from "../types/Steps";

interface RouteState {
  route: Step[];
  actions: {
    appendRoute: (step: Step) => void;
    deleteSteps: (ids: string[]) => void;
    reset: () => void;
  };
}

export const useRouteStore = create<RouteState>((set) => ({
  route: [],
  actions: {
    appendRoute: (step) =>
      set((state) => ({ route: [...state.route, step] })),
    deleteSteps: (ids) =>
      set((state) => ({ route: state.route.filter((s) => !ids.includes(s.id)) })),
    reset: () => set({ route: [] }),
  },
}));

export const useRouteActions = () => useRouteStore((state) => state.actions);

export const useRoute = () =>
  useRouteStore(useShallow((state) => state.route));
