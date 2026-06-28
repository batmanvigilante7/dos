import { appStore, useAppState } from "../core/store";

export function Topbar() {
  const query = useAppState(s => s.searchQuery);
  return (
    <header className="topbar">
      <div>
        <small>BUILD 012 · KNOWLEDGE ATLAS ENGINE</small>
        <h1>Developer OS</h1>
      </div>
      <label>
        <span>⌕</span>
        <input 
          value={query} 
          onChange={e => appStore.search(e.target.value)} 
          placeholder="Search modules, nodes, concepts…"
        />
        <kbd>Ctrl K</kbd>
      </label>
      <button onClick={() => appStore.palette(true)}>⚡</button>
    </header>
  );
}
