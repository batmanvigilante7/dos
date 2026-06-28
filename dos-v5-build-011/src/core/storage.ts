import type { Progress } from "../types/domain";

const KEY = "dos-v5-build-011";

const empty = (): Progress => ({
  statusById: {},
  bookmarks: {},
  expandedNodes: {},
  searchHistory: [],
  selectedNodeId: null,
  notes: {},
  activeModuleId: null,
  knowledgeDepth: 3
});

export const storage = {
  load: (): Progress => {
    try {
      return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
      return empty();
    }
  },
  save: (progress: Progress) => localStorage.setItem(KEY, JSON.stringify(progress)),
  reset: () => localStorage.removeItem(KEY)
};
