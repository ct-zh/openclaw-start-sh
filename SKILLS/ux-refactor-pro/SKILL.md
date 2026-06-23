---
name: ux-refactor-pro
description: Redesign existing complex Web UI into high-quality A/B static HTML prototypes. Use when the user asks to visually refactor, declutter, restructure, compare alternative UX directions, or reduce information density for an existing page, dashboard, tool, admin screen, or web app workflow.
---

# UX Refactor Pro

## Overview

Use this skill to turn an existing messy or dense Web UI into two strongly differentiated static prototype directions. Default to producing standalone A/B HTML prototypes for review, not editing production UI, unless the user explicitly asks for direct code changes.

The goal is entropy reduction: clarify the hierarchy, separate competing modes of attention, and make the worst realistic data state easier to scan, compare, and act on.

## Operating Rules

- Inspect the existing artifact first when source files, a live URL, screenshots, or design references are available.
- If missing information would materially change the design direction, ask only the minimum necessary clarification before proceeding.
- Keep the default output independent from the app codebase: create static prototype files unless direct implementation is requested.
- Present A/B architecture directions and wait for user confirmation before building full prototypes, unless the user explicitly asks to generate immediately.
- Follow any active frontend design instructions in the environment. Do not violate existing project design systems when working inside an app.
- Prefer distinctive typography only when the prototype is independent or the project has no established typography. Do not reject Arial, Inter, or system fonts when they are part of the existing product language.

## Workflow

### 1. Audit The Existing UI

Identify the page's real structure before proposing aesthetics:

- Data skeleton: time-driven, category-driven, entity-driven, task-driven, or mixed.
- Text and media extremes: longest labels, densest table rows, largest cards, longest form states, empty/error/loading states.
- User attention path: scanning, comparing, editing, triaging, monitoring, reviewing, or storytelling.
- Action frequency: always-visible core actions, secondary actions, and low-frequency destructive or administrative actions.

Ask clarifying questions only when these cannot be inferred from the provided files, screenshots, or user request.

### 2. Reduce Information Entropy

Use these transformations as diagnostic tools, not as fixed templates:

- Spatial separation: split parallel categories into tabs, columns, boards, or master-detail structures.
- Temporal separation: expose progress, history, versions, logs, or status movement through timelines, step flows, or state lanes.
- Progressive disclosure: keep high-frequency information visible, soften medium-frequency context, and move low-frequency actions to hover, menus, drawers, or detail panels.
- Visual tension: create hierarchy through contrast in scale, density, weight, rhythm, alignment, and neutral space instead of relying on decorative effects.
- Micro-indicators: use restrained color chips, status marks, counters, and metadata labels to support scanning without turning the whole UI into a color field.

Avoid one-note palettes, decorative blobs, excessive cards, nested cards, and generic landing-page composition when the target is an operational interface.

### 3. Propose A/B Architecture Directions

Before building, propose two directions that differ materially in layout, density, and interaction emphasis. Include:

- The core concept for each variant.
- The information architecture each variant uses.
- What user behavior each variant optimizes.
- The risk or tradeoff of each variant.
- The kind of real page each variant is best suited for.

Useful families include, but are not limited to:

- Brutally Minimal: high focus, strong typography, sparse chrome, low visible controls.
- Industrial Utilitarian: dense information surfaces, precise grids, compact controls, strong scan efficiency.
- Editorial Magazine: asymmetric composition, narrative hierarchy, large anchors, suitable for content-heavy or showcase surfaces.
- Command Center: monitoring-first hierarchy, persistent filters, status lanes, high-frequency triage affordances.
- Split Studio: master-detail editing, contextual side panels, preview-and-edit rhythm.

### 4. Build Static Prototypes

After the user confirms the A/B directions, create static HTML prototypes. Prefer:

- A single `index.html` with an A/B switch when comparison is the main goal.
- Separate `variant-a.html` and `variant-b.html` when each direction needs a distinct canvas or interaction model.
- Dependency-free HTML/CSS/JS unless the existing project already has a relevant stack and the user asks to integrate with it.

Populate prototypes with deliberately difficult data:

- Long names and labels.
- Mixed statuses and edge-case metadata.
- Dense rows, crowded cards, and empty states.
- Destructive and low-frequency actions that should not dominate.
- Mobile-width stress cases.

### 5. Verify Visually

Run browser verification whenever a runnable prototype is created:

- Check desktop and mobile viewport screenshots.
- Confirm text does not overlap or overflow its container.
- Confirm controls remain reachable and labels fit.
- Confirm the A/B comparison mechanism works if present.
- Fix visible layout problems before reporting completion.

## Output Summary

When finishing, report:

- Prototype file path(s).
- What each variant optimizes for.
- The main tradeoff between variants.
- The verification performed and any remaining uncertainty.
