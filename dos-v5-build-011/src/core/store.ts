import { useSyncExternalStore } from "react";
import { storage } from "./storage";
import type { AtlasNode, LearningStatus, State } from "../types/domain";

type Listener = () => void;

let state: State = {
  modules: [],
  activeModule: null,
  selectedNode: null,
  searchQuery: "",
  paletteOpen: false,
  progress: storage.load(),
  loading: true,
  error: null
};

const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l());

const set = (recipe: (s: State) => State, persist = false) => {
  state = recipe(state);
  if (persist) {
    storage.save(state.progress);
  }
  emit();
};

// Helper function to recursively find a node in the tree
export function findNodeInTree(node: AtlasNode | null, id: string): AtlasNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper to recursively set parentIds inside a tree for structural lookups
function wireParentIds(node: AtlasNode, parentId: string | null = null) {
  node.parentId = parentId;
  if (node.children) {
    node.children.forEach(child => wireParentIds(child, node.id));
  }
}

export const appStore = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  snapshot: () => state,

  // Load modules list first, then load the active module
  async load() {
    try {
      set(s => ({ ...s, loading: true, error: null }));
      const r = await fetch("/data/modules.json");
      if (!r.ok) throw new Error("Could not load knowledge atlas modules list.");
      
      const modules = (await r.json()) as AtlasNode[];
      
      // Determine active module ID (from progress or fallback to first)
      const activeId = state.progress.activeModuleId || modules[0]?.id || null;
      const activeModuleMetadata = modules.find(m => m.id === activeId) || modules[0];
      
      let activeModule: AtlasNode | null = null;
      
      if (activeModuleMetadata && activeModuleMetadata.path) {
        const moduleRes = await fetch(activeModuleMetadata.path);
        if (moduleRes.ok) {
          activeModule = (await moduleRes.json()) as AtlasNode;
          wireParentIds(activeModule);
        }
      }

      // Map selected node if set
      let selectedNode: AtlasNode | null = null;
      if (state.progress.selectedNodeId && activeModule) {
        selectedNode = findNodeInTree(activeModule, state.progress.selectedNodeId);
      }

      set(s => ({
        ...s,
        modules,
        activeModule,
        selectedNode,
        loading: false,
        progress: {
          ...s.progress,
          activeModuleId: activeModuleMetadata?.id || null
        }
      }), true);
    } catch (e) {
      set(s => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Unknown error loading atlas."
      }));
    }
  },

  // Set active module and fetch its dynamic JSON tree
  async setActiveModule(moduleId: string) {
    const meta = state.modules.find(m => m.id === moduleId);
    if (!meta || !meta.path) return;

    set(s => ({ ...s, loading: true }));
    try {
      const res = await fetch(meta.path);
      if (!res.ok) throw new Error(`Could not load module tree at path: ${meta.path}`);
      
      const activeModule = (await res.json()) as AtlasNode;
      wireParentIds(activeModule);

      set(s => ({
        ...s,
        activeModule,
        selectedNode: null,
        loading: false,
        progress: {
          ...s.progress,
          activeModuleId: moduleId,
          selectedNodeId: null
        }
      }), true);
    } catch (e) {
      set(s => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "Error loading module tree."
      }));
    }
  },

  // Node selection triggers inspector slider
  selectNode(nodeId: string | null) {
    let selectedNode: AtlasNode | null = null;
    if (nodeId && state.activeModule) {
      selectedNode = findNodeInTree(state.activeModule, nodeId);
    }
    
    // Track search history if selecting from a search query
    let history = [...state.progress.searchHistory];
    if (state.searchQuery && nodeId && !history.includes(state.searchQuery)) {
      history = [state.searchQuery, ...history].slice(0, 10);
    }

    set(s => ({
      ...s,
      selectedNode,
      progress: {
        ...s.progress,
        selectedNodeId: nodeId,
        searchHistory: history
      }
    }), true);
  },

  // Expand / collapse branch nodes
  toggleExpandNode(nodeId: string) {
    set(s => {
      const nextExpanded = { ...s.progress.expandedNodes };
      nextExpanded[nodeId] = !nextExpanded[nodeId];
      return {
        ...s,
        progress: {
          ...s.progress,
          expandedNodes: nextExpanded
        }
      };
    }, true);
  },

  // Toggle bookmark on a node
  toggleBookmark(nodeId: string) {
    set(s => {
      const nextBookmarks = { ...s.progress.bookmarks };
      nextBookmarks[nodeId] = !nextBookmarks[nodeId];
      return {
        ...s,
        progress: {
          ...s.progress,
          bookmarks: nextBookmarks
        }
      };
    }, true);
  },

  // Sets custom node learning statuses
  setNodeStatus(nodeId: string, status: LearningStatus) {
    set(s => {
      const nextStatuses = { ...s.progress.statusById };
      nextStatuses[nodeId] = status;
      return {
        ...s,
        progress: {
          ...s.progress,
          statusById: nextStatuses
        }
      };
    }, true);
  },

  // Update live search queries
  search(query: string) {
    set(s => ({
      ...s,
      searchQuery: query
    }));
  },

  // Clear query history
  clearSearchHistory() {
    set(s => ({
      ...s,
      progress: {
        ...s.progress,
        searchHistory: []
      }
    }), true);
  },

  // Adjust zoom depth level of visual connectors
  updateKnowledgeDepth(depth: number) {
    set(s => ({
      ...s,
      progress: {
        ...s.progress,
        knowledgeDepth: depth
      }
    }), true);
  },

  // Toggle command search overlay
  palette(open: boolean) {
    set(s => ({ ...s, paletteOpen: open }));
  },

  reset() {
    storage.reset();
    set(s => ({
      ...s,
      progress: storage.load(),
      activeModule: null,
      selectedNode: null
    }));
    void this.load();
  }
};

export const useAppState = <T>(selector: (s: State) => T) =>
  useSyncExternalStore(appStore.subscribe, () => selector(appStore.snapshot()), () => selector(appStore.snapshot()));

export const statusFor = (s: State, id: string): LearningStatus =>
  s.progress.statusById[id] ?? "not-started";
