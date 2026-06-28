import React, { useState, useEffect, useMemo } from "react";
import { appStore, statusFor, useAppState } from "../../core/store";
import type { AtlasNode } from "../../types/domain";

// Helper to determine node depth level by its ID prefix
function getNodeLevel(id: string): number {
  if (id.startsWith("module:")) return 1;
  if (id.startsWith("node:")) return 2;
  if (id.startsWith("knode:")) return 3;
  return 4; // micro concepts
}

export function Roadmap() {
  const state = useAppState(s => s);
  const activeModule = state.activeModule;
  const progress = state.progress;
  const searchQuery = state.searchQuery.toLowerCase().trim();

  // Dynamic overlays SVG connectors coordinates
  const [connectors, setConnectors] = useState<{ d: string; color: string; id: string }[]>([]);

  // Trigger recalculation on expansion changes, status changes, depth changes, or searches
  useEffect(() => {
    if (!activeModule) return;

    const newConnectors: { d: string; color: string; id: string }[] = [];
    const containerEl = document.getElementById("atlas-tree-container");
    if (!containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();

    const trace = (node: AtlasNode) => {
      const isExpanded = !!progress.expandedNodes[node.id];
      const level = getNodeLevel(node.id);
      
      // Stop tracing if exceeded depth limits or collapsed
      if (level >= progress.knowledgeDepth || !isExpanded || !node.children) return;

      const parentAnchor = document.getElementById(`anchor-${node.id}`);
      if (!parentAnchor) return;
      const parentRect = parentAnchor.getBoundingClientRect();

      node.children.forEach(child => {
        // Skip child if it doesn't match search filters
        if (searchQuery && !isNodeOrDescendantMatch(child, searchQuery)) return;

        const childAnchor = document.getElementById(`anchor-${child.id}`);
        if (!childAnchor) return;
        const childRect = childAnchor.getBoundingClientRect();

        // Start coordinate: middle-bottom of parent icon
        const startX = parentRect.left + parentRect.width / 2 - containerRect.left;
        const startY = parentRect.bottom - containerRect.top;

        // End coordinate: left edge of child node wrapper card
        const endX = childRect.left - containerRect.left;
        const endY = childRect.top + childRect.height / 2 - containerRect.top;

        // Draw a smooth bezier curve S-curve
        const midY = (startY + endY) / 2;
        const d = `M ${startX} ${startY} C ${startX} ${midY}, ${startX} ${endY}, ${endX} ${endY}`;

        // Color coding line based on completed status
        const childStatus = statusFor(state, child.id);
        const color = childStatus === "completed" 
          ? "var(--green)" 
          : childStatus === "in-progress" 
          ? "var(--yellow)" 
          : "rgba(0,0,0,0.15)";

        newConnectors.push({ d, color, id: `${node.id}-${child.id}` });

        trace(child);
      });
    };

    // Timeout allows rendering layout cycles to update positions before coordinate lookups
    const timer = setTimeout(() => {
      trace(activeModule);
      setConnectors(newConnectors);
    }, 150);

    return () => clearTimeout(timer);
  }, [activeModule, progress.expandedNodes, progress.knowledgeDepth, progress.statusById, searchQuery]);

  // Window resize observer to update SVG curves
  useEffect(() => {
    const handleResize = () => {
      // Re-trigger layout updates
      appStore.updateKnowledgeDepth(progress.knowledgeDepth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [progress.knowledgeDepth]);

  // Helper: check if query matches node or its children
  function isNodeOrDescendantMatch(node: AtlasNode, query: string): boolean {
    if (!query) return true;
    const titleMatch = node.title.toLowerCase().includes(query);
    const descMatch = node.description.toLowerCase().includes(query);
    const idMatch = node.id.toLowerCase().includes(query);
    if (titleMatch || descMatch || idMatch) return true;

    if (node.children) {
      return node.children.some(child => isNodeOrDescendantMatch(child, query));
    }
    return false;
  }

  // Recursive Node renderer
  const renderNode = (node: AtlasNode, depth = 0) => {
    const level = getNodeLevel(node.id);

    // Filter by visual depth limits
    if (level > progress.knowledgeDepth) return null;

    // Filter by search query filters
    if (searchQuery && !isNodeOrDescendantMatch(node, searchQuery)) return null;

    const isExpanded = !!progress.expandedNodes[node.id];
    const isSelected = state.progress.selectedNodeId === node.id;
    const status = statusFor(state, node.id);
    const hasChildren = node.children && node.children.length > 0;

    // If search active, auto-expand parents
    const shouldExpand = searchQuery ? true : isExpanded;

    const handleCardClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      appStore.selectNode(node.id);

      // Auto-toggle expand for module and learning nodes
      if (level < 4 && hasChildren && !searchQuery) {
        appStore.toggleExpandNode(node.id);
      }
    };

    return (
      <div 
        key={node.id} 
        style={{
          display: "flex", 
          flexDirection: "column", 
          gap: "12px", 
          marginLeft: depth > 0 ? "46px" : "0px",
          position: "relative",
          animation: "fadeInUp 0.25s ease"
        }}
      >
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .node-row:hover {
            transform: scale(1.01) translate(-2px, -2px);
            box-shadow: 6px 6px 0 var(--ink) !important;
          }
          .node-row.selected {
            outline: 4px solid var(--blue);
            box-shadow: 6px 6px 0 var(--ink) !important;
          }
        `}</style>

        {/* Node Layout card */}
        <div 
          onClick={handleCardClick}
          className={`node-row ${isSelected ? 'selected' : ''}`}
          style={{
            display: "flex",
            alignItems: "center",
            background: "#fff",
            border: "3px solid var(--ink)",
            borderRadius: "16px",
            padding: "12px 16px",
            boxShadow: "4px 4px 0 var(--ink)",
            cursor: "pointer",
            width: "fit-content",
            minWidth: "340px",
            maxWidth: "500px",
            gap: "12px",
            transition: "all 200ms cubic-bezier(0.25, 0.8, 0.25, 1)",
            position: "relative",
            zIndex: 10
          }}
        >
          {/* Anchor element for SVG line rendering */}
          <div 
            id={`anchor-${node.id}`} 
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              border: "2px solid var(--ink)",
              display: "grid",
              placeItems: "center",
              background: status === "completed" ? "var(--green)" : status === "in-progress" ? "var(--yellow)" : "var(--paper)",
              fontSize: "1.1rem",
              flexShrink: 0
            }}
          >
            {node.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <code style={{ fontSize: "0.62rem", background: "var(--muted)", padding: "1px 4px", borderRadius: "4px" }}>
                {node.id.split(":").slice(-1)[0].toUpperCase()}
              </code>
              <span style={{ fontSize: "0.58rem", textTransform: "uppercase", fontWeight: "bold", opacity: 0.6 }}>
                {level === 1 ? "Module" : level === 2 ? "Learning Node" : level === 3 ? "Knowledge" : "Concept"}
              </span>
            </div>
            <h4 style={{ margin: 0, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {node.title}
            </h4>
          </div>

          {/* Expand/Collapse Toggle helper */}
          {hasChildren && level < progress.knowledgeDepth && !searchQuery && (
            <span style={{ fontSize: "0.78rem", fontWeight: "bold", opacity: 0.5 }}>
              {isExpanded ? "▼" : "▶"}
            </span>
          )}
        </div>

        {/* Children Render block container */}
        {hasChildren && shouldExpand && level < progress.knowledgeDepth && (
          <div 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "16px",
              position: "relative"
            }}
          >
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (state.loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "calc(100vh - 100px)", color: "var(--ink)", fontWeight: "bold" }}>
        🚀 Loading Curriculum Atlas Tree...
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--red)" }}>
        <h3>Error Loading Atlas</h3>
        <p>{state.error}</p>
        <button onClick={() => appStore.load()} style={{ background: "var(--ink)", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="roadmap" style={{ height: "calc(100vh - 100px)", display: "flex", flexDirection: "column", background: "var(--paper)", position: "relative" }}>
      <header style={{ padding: "12px 20px", borderBottom: "2px dashed var(--ink)", background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ background: "var(--yellow)", padding: "2px 6px", border: "1.5px solid var(--ink)", borderRadius: "4px", fontSize: "0.68rem", fontWeight: "bold" }}>
            MODULE VIEW
          </span>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{activeModule?.title}</h3>
        </div>
        <small style={{ fontSize: "0.68rem", opacity: 0.6 }}>
          Zoom depth levels: {progress.knowledgeDepth} / 4. Collapsible branches persist.
        </small>
      </header>

      {/* Interactive auto-flow canvas */}
      <div 
        id="atlas-tree-container"
        className="canvas" 
        onClick={handleCanvasClick}
        style={{ 
          flex: 1, 
          overflow: "auto", 
          padding: "32px",
          position: "relative" 
        }}
      >
        <div style={{ position: "relative", minWidth: "800px", minHeight: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SVG Connector overlay */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1
            }}
          >
            <style>{`
              @keyframes drawDash {
                to {
                  stroke-dashoffset: 0;
                }
              }
              .overlay-connector {
                stroke-dasharray: 6,4;
                stroke-dashoffset: 20;
                animation: drawDash 0.8s linear infinite;
              }
            `}</style>
            
            {connectors.map(c => (
              <path
                key={c.id}
                className="overlay-connector"
                d={c.d}
                style={{
                  stroke: c.color,
                  strokeWidth: "2.5px",
                  fill: "none",
                  opacity: 0.7,
                  transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease"
                }}
              />
            ))}
          </svg>

          {/* Recursive Node Tree root wrapper */}
          <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: "20px" }}>
            {activeModule ? renderNode(activeModule) : (
              <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>
                Select a module in the sidebar to begin exploring.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      appStore.selectNode(null);
    }
  }
}
