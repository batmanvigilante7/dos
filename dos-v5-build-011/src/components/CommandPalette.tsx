import { useMemo, useEffect, useState } from "react";
import { appStore, useAppState } from "../core/store";
import type { AtlasNode } from "../types/domain";

export function CommandPalette() {
  const open = useAppState(s => s.paletteOpen);
  const activeModule = useAppState(s => s.activeModule);
  
  const [query, setQuery] = useState("");

  // Global keypress listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        appStore.palette(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Flatten active module nodes list to search through them
  const flatNodes = useMemo(() => {
    const list: AtlasNode[] = [];
    const traverse = (node: AtlasNode | null) => {
      if (!node) return;
      list.push(node);
      node.children?.forEach(traverse);
    };
    traverse(activeModule);
    return list;
  }, [activeModule]);

  // Match search terms
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return flatNodes.slice(0, 8);
    
    return flatNodes.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.description.toLowerCase().includes(q) || 
      n.id.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query, flatNodes]);

  if (!open) return null;

  return (
    <div 
      className="palette-overlay" 
      onMouseDown={() => appStore.palette(false)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "grid",
        placeItems: "center",
        zIndex: 99999,
        animation: "fadeIn 0.2s ease"
      }}
    >
      <section 
        className="palette" 
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: "550px",
          background: "#fff",
          border: "4px solid var(--ink)",
          borderRadius: "20px",
          boxShadow: "8px 8px 0 var(--ink)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "3px solid var(--ink)", background: "var(--paper)" }}>
          <b style={{ fontSize: "0.85rem" }}>⚡ Search Knowledge Atlas</b>
          <span style={{ fontSize: "0.68rem", opacity: 0.6 }}><kbd>Esc</kbd> to close</span>
        </header>

        <input 
          autoFocus 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Search module, learning node, concept..." 
          style={{
            padding: "16px",
            border: "none",
            borderBottom: "3px solid var(--ink)",
            fontSize: "1rem",
            outline: "none",
            fontWeight: "bold"
          }}
          onKeyDown={e => {
            if (e.key === "Escape") {
              appStore.palette(false);
            }
            if (e.key === "Enter" && results[0]) {
              appStore.selectNode(results[0].id);
              appStore.palette(false);
            }
          }}
        />

        <div style={{ maxHeight: "300px", overflow: "auto", padding: "8px" }}>
          {results.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "0.8rem", color: "#666" }}>
              No nodes found matching your query.
            </div>
          ) : (
            results.map(node => (
              <button 
                key={node.id} 
                onClick={() => {
                  appStore.selectNode(node.id);
                  appStore.palette(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "background 0.15s ease",
                  marginBottom: "4px"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--yellow)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ fontSize: "1.2rem" }}>{node.icon}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <b style={{ fontSize: "0.82rem", color: "var(--ink)" }}>{node.title}</b>
                  <small style={{ fontSize: "0.62rem", color: "#555" }}>{node.id}</small>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
