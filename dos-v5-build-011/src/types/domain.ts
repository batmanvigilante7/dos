export type LearningStatus = "not-started" | "in-progress" | "completed";

export interface Experience {
  id: string;
  type: 'lesson' | 'playground' | 'lab' | 'quiz' | 'challenge' | 'flashcards' | 'revision' | 'creator-kit';
  title: string;
  xpReward: number;
}

export interface Resource {
  title: string;
  url: string;
}

export interface AtlasNode {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  xpReward: number;
  status: LearningStatus;
  prerequisites: string[];
  relatedNodes: string[];
  children?: AtlasNode[];
  experiences?: Experience[];
  resources?: Resource[];
  
  // Flat layout parameters
  parentId?: string | null;
  path?: string;
}

export interface Progress {
  statusById: Record<string, LearningStatus>;
  bookmarks: Record<string, boolean>;
  expandedNodes: Record<string, boolean>;
  searchHistory: string[];
  selectedNodeId: string | null;
  notes: Record<string, string>;
  activeModuleId: string | null;
  knowledgeDepth: number; // custom zoom depth
}

export interface State {
  modules: AtlasNode[]; // loaded modules metadata list
  activeModule: AtlasNode | null; // active module nested tree
  selectedNode: AtlasNode | null; // currently selected node inside inspector
  searchQuery: string;
  paletteOpen: boolean;
  progress: Progress;
  loading: boolean;
  error: string | null;
}
