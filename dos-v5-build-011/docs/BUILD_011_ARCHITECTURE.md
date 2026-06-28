# Build 011 Architecture

```text
React Components
  → appStore actions
    → central state
      → storage service
        → subscription re-render
```

## Boundaries
- Components: render + dispatch actions
- Store: state transitions
- Storage: persistence only
- JSON: curriculum metadata only
- Future engines: lesson, Git simulation, mission, creator
