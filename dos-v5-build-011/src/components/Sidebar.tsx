import { useMemo } from "react";
import { appStore, statusFor, useAppState } from "../core/store";
import type { AtlasNode } from "../types/domain";

export function Sidebar() {
  const state = useAppState(s => s);
  
  const modules = state.modules;
  const activeModule = state.activeModule;
  const progress = state.progress;
  const query = state.searchQuery;

  // Flatten active module nodes helper to calculate progress stats
  const allActiveNodes = useMemo(() => {
    const list: AtlasNode[] = [];
    const traverse = (node: AtlasNode | null) => {
      if (!node) return;
      list.push(node);
      node.children?.forEach(traverse);
    };
    traverse(activeModule);
    return list;
  }, [activeModule]);

  // Dynamic progress stats
  const { total, done, pct } = useMemo(() => {
    const count = allActiveNodes.length;
    if (count === 0) return { total: 0, done: 0, pct: 0 };
    
    const completed = allActiveNodes.filter(n => statusFor(state, n.id) === "completed").length;
    return {
      total: count,
      done: completed,
      pct: Math.round((completed / count) * 100)
    };
  }, [allActiveNodes, state]);

  // Bookmarks nodes list
  const bookmarkedNodes = useMemo(() => {
    return allActiveNodes.filter(n => progress.bookmarks[n.id]);
  }, [allActiveNodes, progress.bookmarks]);

  return (
    <aside 
      className="sidebar"
      style={{
        width: "290px",
        background: "var(--paper)",
        borderRight: "4px solid var(--ink)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        flexShrink: 0
      }}
    >
      {/* Brand headers */}
      <section className="brand" style={{ padding: "20px", borderBottom: "3px solid var(--ink)", background: "var(--muted)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: "1.2rem", letterSpacing: "-0.04em" }}>KNOWLEDGE ATLAS</b>
          <span style={{ fontSize: "0.55rem", border: "1.5px solid var(--ink)", background: "#fff", padding: "1px 5px", borderRadius: "4px", fontWeight: "bold" }}>
            DOS v5
          </span>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: "0.68rem", lineHeight: 1.35, opacity: 0.8 }}>
          Tree-based recursive structure explorer with responsive auto-flow connectors.
        </p>
      </section>

      {/* Dynamic Search Box */}
      <section style={{ padding: "12px 16px", borderBottom: "2px dashed var(--ink)" }}>
        <small style={{ fontWeight: "bold", display: "block", marginBottom: "4px", fontSize: "0.62rem" }}>SEARCH GRAPH</small>
        <input
          type="text"
          value={query}
          onChange={e => appStore.search(e.target.value)}
          placeholder="Filter modules, nodes, concepts..."
          style={{
            width: "100%",
            padding: "8px",
            border: "2px solid var(--ink)",
            borderRadius: "10px",
            fontSize: "0.78rem",
            fontWeight: "bold",
            outline: "none"
          }}
        />
      </section>

      {/* Scrollable list items panel */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }} className="sidebar-scroll">
        
        {/* Module Switcher List */}
        <section>
          <small style={{ fontWeight: "bold", display: "block", marginBottom: "6px", fontSize: "0.62rem" }}>LEARNING MODULES</small>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {modules.map(mod => {
              const isActive = activeModule?.id === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => appStore.setActiveModule(mod.id)}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    background: isActive ? "var(--yellow)" : "transparent",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.background = "var(--muted)")}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "1.1rem" }}>{mod.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.title}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Knowledge depth visual zoom slider */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <small style={{ fontWeight: "bold", fontSize: "0.62rem" }}>GRAPH DEPTH LIMIT</small>
            <span style={{ fontSize: "0.65rem", fontWeight: "bold", background: "var(--muted)", padding: "1px 5px", border: "1px solid var(--ink)", borderRadius: "4px" }}>
              Lvl {progress.knowledgeDepth}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            value={progress.knowledgeDepth}
            onChange={e => appStore.updateKnowledgeDepth(parseInt(e.target.value))}
            style={{ width: "100%", cursor: "pointer", accentColor: "var(--ink)" }}
          />
        </section>

        {/* Bookmarks Node List */}
        {bookmarkedNodes.length > 0 && (
          <section>
            <small style={{ fontWeight: "bold", display: "block", marginBottom: "6px", fontSize: "0.62rem" }}>🔖 BOOKMARKED NODES</small>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {bookmarkedNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => appStore.selectNode(node.id)}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    background: "#fff",
                    border: "1.5px solid var(--ink)",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: "bold",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>{node.icon}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent Node Searches History */}
        {progress.searchHistory.length > 0 && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <small style={{ fontWeight: "bold", fontSize: "0.62rem" }}>🔍 RECENT SEARCHES</small>
              <button 
                onClick={() => appStore.clearSearchHistory()}
                style={{ background: "transparent", border: "none", fontSize: "0.58rem", textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}
              >
                Clear
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {progress.searchHistory.map((term, i) => (
                <button
                  key={i}
                  onClick={() => appStore.search(term)}
                  style={{
                    cursor: "pointer",
                    background: "var(--muted)",
                    border: "1px solid var(--ink)",
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontSize: "0.65rem",
                    fontWeight: "bold"
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* Progress display stats */}
      <section className="progress" style={{ padding: "20px", borderTop: "3px solid var(--ink)", background: "var(--muted)" }}>
        <small style={{ fontWeight: "bold", display: "block", marginBottom: "4px", fontSize: "0.62rem" }}>MODULE PROGRESS</small>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "0.82rem", marginBottom: "6px" }}>
          <span>{pct}% Completed</span>
          <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{done}/{total} nodes</span>
        </div>
        <div style={{ height: "12px", background: "#fff", border: "2.5px solid var(--ink)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)" }} />
        </div>
      </section>

      {/* Keyboard instructions footer */}
      <footer style={{ padding: "10px 16px", borderTop: "2px dashed var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.68rem" }}>
        <span>Press <kbd style={{ padding: "2px 4px", border: "1px solid var(--ink)", borderRadius: "4px", background: "#fff" }}>Ctrl+K</kbd> for actions</span>
        <button 
          onClick={() => appStore.palette(true)}
          style={{ background: "transparent", border: "none", textDecoration: "underline", fontWeight: "bold", cursor: "pointer", fontSize: "0.68rem" }}
        >
          Palette
        </button>
      </footer>
    </aside>
  );
}
