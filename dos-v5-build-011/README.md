# DOS v5 — Build 011

Clean React + TypeScript + Vite foundation for Developer Operating System.

## What is real in this build
- Central reactive application store
- Storage service (components never touch localStorage)
- JSON-loaded 88-node curriculum metadata
- Three-panel shell: Sidebar → Roadmap → Inspector
- Command Palette: `Ctrl/Cmd + K`
- Progress, bookmarks, notes, and module collapsing

## What is intentionally not faked
- 88 authored lessons
- Virtual Git engine
- Missions, verification, analytics, creator studio

## Run
```bash
npm install
npm run dev
```

## Build order
- Build 011: Core engine + data layer + app shell
- Build 012: Lesson schema + content pipeline
- Build 013: Virtual Git engine and state-aware parser
- Build 014: Lesson renderer blocks
- Build 015: Search / analytics / plugin registry

**Architecture rule:** Actions → Engine → State → Renderer → UI
