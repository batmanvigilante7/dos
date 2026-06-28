import { appStore, statusFor, useAppState } from "../core/store";
import type { AtlasNode } from "../types/domain";

export function Inspector() {
  const state = useAppState(s => s);
  const selectedNode = state.selectedNode;

  if (!selectedNode) {
    return null;
  }

  const status = statusFor(state, selectedNode.id);
  const isBookmarked = !!state.progress.bookmarks[selectedNode.id];

  // Look up prerequisite and related nodes names by ID
  const getNodesTitlesByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    
    const list: string[] = [];
    const searchTree = (n: AtlasNode | null) => {
      if (!n) return;
      if (ids.includes(n.id)) {
        list.push(n.title);
      }
      n.children?.forEach(searchTree);
    };

    searchTree(state.activeModule);
    return list;
  };

  const prereqNames = getNodesTitlesByIds(selectedNode.prerequisites);
  const relatedNames = getNodesTitlesByIds(selectedNode.relatedNodes);

  return (
    <aside 
      className="inspector-panel"
      style={{
        width: "350px",
        borderLeft: "4px solid var(--ink)",
        background: "var(--paper)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        zIndex: 1000,
        position: "relative",
        animation: "slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards"
      }}
    >
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .inspector-panel button.action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 4px 4px 0 var(--ink) !important;
        }
      `}</style>

      {/* Header bar */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "3px solid var(--ink)", background: "var(--muted)" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "1.4rem" }}>{selectedNode.icon}</span>
          <b style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Node details</b>
        </div>
        <button 
          onClick={() => appStore.selectNode(null)}
          style={{ cursor: "pointer", background: "var(--red)", color: "#fff", border: "2px solid var(--ink)", borderRadius: "8px", padding: "4px 8px", fontSize: "0.7rem", fontWeight: "bold" }}
        >
          Close [Esc]
        </button>
      </header>

      {/* Detail body scroll */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Title & Icon summary */}
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "1.2rem", lineHeight: 1.25 }}>{selectedNode.title}</h3>
          <code style={{ fontSize: "0.65rem", background: "var(--muted)", padding: "2px 6px", border: "1.5px solid var(--ink)", borderRadius: "4px" }}>
            {selectedNode.id}
          </code>
        </div>

        {/* Status & Bookmarks controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", borderBottom: "2px dashed var(--ink)", paddingBottom: "16px" }}>
          {/* Status select */}
          <div style={{ flex: 1 }}>
            <small style={{ fontWeight: "bold", display: "block", marginBottom: "4px", fontSize: "0.62rem" }}>LEARNING PROGRESS</small>
            <select
              value={status}
              onChange={e => appStore.setNodeStatus(selectedNode.id, e.target.value as any)}
              style={{
                width: "100%",
                padding: "8px",
                border: "2px solid var(--ink)",
                borderRadius: "10px",
                fontSize: "0.78rem",
                fontWeight: "bold",
                background: status === "completed" ? "var(--green)" : status === "in-progress" ? "var(--yellow)" : "#fff",
                cursor: "pointer"
              }}
            >
              <option value="not-started">○ Not Started</option>
              <option value="in-progress">◐ In Progress</option>
              <option value="completed">✓ Completed</option>
            </select>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => appStore.toggleBookmark(selectedNode.id)}
            className="action-btn"
            style={{
              cursor: "pointer",
              padding: "10px",
              background: isBookmarked ? "var(--pink)" : "#fff",
              border: "2px solid var(--ink)",
              borderRadius: "10px",
              boxShadow: "2px 2px 0 var(--ink)",
              fontSize: "1rem",
              transition: "all 0.15s ease",
              marginTop: "16px"
            }}
            title={isBookmarked ? "Remove Bookmark" : "Bookmark Node"}
          >
            {isBookmarked ? "🔖" : "🏷️"}
          </button>
        </div>

        {/* Overview specs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--muted)", padding: "12px", borderRadius: "14px", border: "2px solid var(--ink)", fontSize: "0.72rem" }}>
          <div>
            <b>Difficulty:</b>
            <div style={{ textTransform: "capitalize", fontWeight: "bold", marginTop: "2px" }}>
              {selectedNode.difficulty === "beginner" ? "🟢 Beginner" : selectedNode.difficulty === "intermediate" ? "🟡 Intermediate" : "🔴 Advanced"}
            </div>
          </div>
          <div>
            <b>XP Reward:</b>
            <div style={{ fontWeight: "bold", marginTop: "2px" }}>⚡ {selectedNode.xpReward} XP</div>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <b>Estimated Time:</b>
            <div style={{ fontWeight: "bold", marginTop: "2px" }}>⏱ {selectedNode.estimatedTime}</div>
          </div>
        </div>

        {/* Description Outcome */}
        <section>
          <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "#666" }}>Node Description</h4>
          <p style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.45 }}>{selectedNode.description}</p>
        </section>

        {/* Prerequisites */}
        {prereqNames.length > 0 && (
          <section>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "var(--red)" }}>⚠️ Prerequisites</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {prereqNames.map((name, i) => (
                <span key={i} style={{ fontSize: "0.7rem", border: "1.5px solid var(--ink)", background: "#fff", padding: "2px 6px", borderRadius: "6px" }}>
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Related Nodes */}
        {relatedNames.length > 0 && (
          <section>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "var(--purple)" }}>🧠 Related Concepts</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {relatedNames.map((name, i) => (
                <span key={i} style={{ fontSize: "0.7rem", border: "1.5px solid var(--ink)", background: "#fff", padding: "2px 6px", borderRadius: "6px" }}>
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Children Sub-Nodes list */}
        {selectedNode.children && selectedNode.children.length > 0 && (
          <section>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "#666" }}>📂 Children Nodes ({selectedNode.children.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {selectedNode.children.map(child => (
                <button
                  key={child.id}
                  onClick={() => appStore.selectNode(child.id)}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    background: "#fff",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "0.72rem",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>{child.icon}</span>
                  <span>{child.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Interactive Experiences */}
        {selectedNode.experiences && selectedNode.experiences.length > 0 && (
          <section>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "var(--blue)" }}>🎯 Interactive Experiences</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {selectedNode.experiences.map((exp, i) => (
                <div 
                  key={i} 
                  style={{
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    background: "#fff", 
                    border: "2px solid var(--ink)", 
                    borderRadius: "10px", 
                    padding: "8px 12px",
                    boxShadow: "2px 2px 0 var(--ink)"
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "1rem" }}>
                      {exp.type === "lesson" ? "📖" : exp.type === "quiz" ? "🧠" : exp.type === "playground" ? "💻" : "🎯"}
                    </span>
                    <span style={{ fontSize: "0.74rem", fontWeight: "bold" }}>{exp.title}</span>
                  </div>
                  <span style={{ fontSize: "0.62rem", background: "var(--muted)", border: "1.5px solid var(--ink)", borderRadius: "4px", padding: "1px 4px", fontWeight: "bold" }}>
                    +{exp.xpReward} XP
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Resources URLs */}
        {selectedNode.resources && selectedNode.resources.length > 0 && (
          <section>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.8rem", textTransform: "uppercase", color: "#666" }}>📖 Documentation Resources</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {selectedNode.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--blue)",
                    textDecoration: "underline",
                    fontWeight: "bold",
                    display: "block"
                  }}
                >
                  🔗 {res.title}
                </a>
              ))}
            </div>
          </section>
        )}

      </div>
    </aside>
  );
}
