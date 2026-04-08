# Frontend Code Quality Checklist

## General
- [ ] **Urgent**: Use PascalCase for component names and camelCase for hooks/functions.
- [ ] **Urgent**: Ensure all components are properly exported (default or named as per project convention).
- [ ] **Urgent**: Remove any unused imports or variables.

## Tailwind CSS
- [ ] **Urgent**: Follow the standard Tailwind class ordering (Layout -> Box Model -> Typography -> Visuals -> Misc).
- [ ] **Suggestion**: Avoid excessive use of arbitrary values (e.g., `h-[123px]`); use theme-defined spacing where possible.
- [ ] **Suggestion**: Use `cn()` or `clsx/tailwind-merge` for conditional class joining to avoid style conflicts.

## React Flow
- [ ] **Urgent**: Ensure custom nodes and edges are registered correctly in the `nodeTypes` and `edgeTypes` maps.
- [ ] **Urgent**: Use `useNodesState` and `useEdgesState` for managing flow state unless a global store is required.
- [ ] **Suggestion**: Keep node data objects immutable; use functional updates when modifying nodes or edges.

## Hooks & State
- [ ] **Urgent**: Always include all dependencies in the dependency array of `useEffect`, `useMemo`, and `useCallback`.
- [ ] **Suggestion**: Prefer custom hooks for complex logic shared across multiple components.
- [ ] **Suggestion**: Avoid prop drilling; use context or a state management library (like Zustand) for global state.

## Typing (TypeScript)
- [ ] **Urgent**: Avoid using `any`; define proper interfaces or types for all props and state.
- [ ] **Suggestion**: Use `Record<string, unknown>` instead of `object` for generic objects.
