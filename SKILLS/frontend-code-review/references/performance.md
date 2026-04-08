# Frontend Performance Checklist

## Memoization
- [ ] **Urgent**: Use `React.memo()` for expensive-to-render components that receive the same props frequently.
- [ ] **Urgent**: Memoize event handlers with `useCallback` when passed to memoized child components.
- [ ] **Urgent**: Memoize complex calculations or object/array transformations with `useMemo`.

## Rendering
- [ ] **Urgent**: Avoid defining components inside other components, as this causes them to be recreated on every render.
- [ ] **Suggestion**: Use virtualization (e.g., `react-window`) for long lists or large data tables.
- [ ] **Suggestion**: Minimize the number of re-renders by lifting state only as high as necessary.

## React Flow Performance
- [ ] **Urgent**: Use `onlyRenderVisibleElements` in `<ReactFlow />` for large graphs.
- [ ] **Suggestion**: Optimize custom nodes by memoizing their content and using `memo` on the node component itself.
- [ ] **Suggestion**: Avoid heavy logic inside `onNodesChange` or `onEdgesChange` callbacks.

## Loading & Assets
- [ ] **Urgent**: Use Next.js `Image` component for optimized image loading.
- [ ] **Suggestion**: Implement code splitting with `dynamic()` for large libraries or components that are not immediately needed.
- [ ] **Suggestion**: Use priority loading for above-the-fold images.
