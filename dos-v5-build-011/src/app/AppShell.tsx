import { useEffect } from "react";
import { Sidebar } from "../components/Sidebar";
import { Topbar } from "../components/Topbar";
import { Roadmap } from "../features/roadmap/Roadmap";
import { Inspector } from "../components/Inspector";
import { CommandPalette } from "../components/CommandPalette";
import { appStore } from "../core/store";

export function AppShell() {
  // Load atlas JSON files on initial render
  useEffect(() => {
    void appStore.load();
  }, []);

  return (
    <div 
      className="app-shell"
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative"
      }}
    >
      {styleDefinitions()}

      {/* Left Sidebar */}
      <Sidebar />

      {/* Center Workspace canvas */}
      <main 
        className="workspace"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          background: "var(--paper)",
          color: "var(--ink)",
          position: "relative"
        }}
      >
        <Topbar />
        <Roadmap />
      </main>

      {/* Right Drawer Inspector */}
      <Inspector />

      {/* Ctrl+K Command Palette */}
      <CommandPalette />
    </div>
  );
}

// Global visual style guidelines for premium aesthetics
function styleDefinitions() {
  return (
    <style>{`
      :root {
        --paper: #f8f9fa;
        --muted: #e9ecef;
        --ink: #1a1a1a;
        --yellow: #ffd43b;
        --green: #12d18e;
        --blue: #2f6bff;
        --red: #ff6b6b;
        --pink: #ff85a2;
        --purple: #b197fc;
        --shadow: 4px 4px 0 var(--ink);
        --small: 2px 2px 0 var(--ink);
      }

      body {
        margin: 0;
        font-family: 'Inter', system-ui, sans-serif;
        background: var(--paper);
        color: var(--ink);
      }

      /* Scrollbar stylings */
      .sidebar-scroll::-webkit-scrollbar,
      .instructions-body::-webkit-scrollbar,
      .terminal-logs::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb,
      .instructions-body::-webkit-scrollbar-thumb,
      .terminal-logs::-webkit-scrollbar-thumb {
        background: var(--ink);
        border-radius: 4px;
      }
      .sidebar-scroll::-webkit-scrollbar-track,
      .instructions-body::-webkit-scrollbar-track,
      .terminal-logs::-webkit-scrollbar-track {
        background: transparent;
      }
    `}</style>
  );
}
