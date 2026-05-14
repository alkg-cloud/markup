---
name: visual-qa
description: Use when performing visual QA of the Markup application against the Design System and full-prototype mockups hosted in the "Markup Dev" project on Markup online. Compares live app vs DS components and prototype, generates a divergence and bug report.
---

# Visual QA

Perform a systematic visual and functional audit of the live Markup application by comparing it against the Design System (DS) components and the full-prototype mockup hosted in the "Markup Dev" project on Markup online.

## Prerequisites

- Chrome browser tools (`mcp__claude-in-chrome__*`) must be available.
- Access to Markup online at `https://markup.alego.cloud`.
- The "Markup Dev" project on Markup online contains the authoritative DS components and the full-prototype mockup. **Do NOT modify anything in the "Markup Dev" project.**

## Procedure

### 1. Invoke frontend-design

Use [/frontend-design](skill://c150f394-1353-4ba9-bf7f-85f3b36ff431?s=frontend-design) to load the design quality reference before evaluating.

### 2. Read the feature-catalog

Read [`docs/feature-catalog.md`](docs/feature-catalog.md) end to end. This is the exhaustive inventory of every user-visible surface, interaction, state, and animation. Use it as a checklist during the audit:

- Every surface listed in the catalog must be tested.
- Every state and animation documented must be verified.
- Findings should reference catalog IDs using the `[fc:<id>]` convention (e.g. `[fc:sidebar-tree-expand]`).
- If the live app has surfaces not in the catalog, flag them as "undocumented surface" in the report.
- If the catalog lists surfaces not found in the live app, flag them as "missing implementation".

### 3. Open Markup online and catalog the DS

1. Navigate to `https://markup.alego.cloud` in Chrome.
2. Open the "Markup Dev" project.
3. Identify every DS component mockup (buttons, inputs, dropdowns, modals, toasts, topbar, sidebar, tree, cards, etc.).
4. For each component, note: visual style, spacing, typography, colors, border-radius, shadows, hover/focus/active states, responsive behavior.

### 4. Audit the live app against the DS

For each DS component found in Step 2:

1. Find the corresponding element in the live Markup app (navigate through real projects, create test projects if needed — just avoid touching "Markup Dev").
2. Compare pixel-level: colors, spacing, font-size, font-weight, border, shadow, border-radius.
3. Compare interaction states: hover, focus, active, disabled, loading.
4. Compare responsive behavior at different viewport widths.
5. Record every divergence with:
   - **Component name**
   - **Where** (page/view in the live app)
   - **Expected** (what the DS shows)
   - **Actual** (what the live app shows)
   - **Severity**: `critical` (broken/unusable), `major` (clearly wrong), `minor` (subtle mismatch)

### 5. Compare full-prototype vs live app

1. Open the full-prototype mockup in "Markup Dev".
2. Walk through every screen/view in the prototype.
3. For each screen, open the corresponding view in the live app side-by-side (or sequentially with screenshots).
4. Record layout, spacing, element presence/absence, interaction flow divergences.
5. Test all interactive flows: navigation, create/edit/delete projects, annotations, toolbar actions, keyboard shortcuts, context menus.

### 6. Functional testing

While navigating the live app, also test:

- All clickable elements respond correctly.
- Forms validate and submit properly.
- Error states display correctly.
- Loading states appear where expected.
- Empty states render properly.
- Toast/notification behavior matches DS.
- Keyboard navigation and accessibility basics.

### 7. Generate report

Produce a structured markdown report:

```markdown
# Visual QA Report

## Summary
- Total divergences found: N
- Critical: N | Major: N | Minor: N
- Functional bugs: N

## DS Component Audit
| Component | Status | Divergences |
|-----------|--------|-------------|
| Button    | ✅/⚠️/❌ | description |
| ...       | ...    | ...         |

## Prototype vs Live App
| Screen/View | Status | Divergences |
|-------------|--------|-------------|
| ...         | ...    | ...         |

## Functional Bugs
| # | Location | Description | Severity | Steps to Reproduce |
|---|----------|-------------|----------|--------------------|
| 1 | ...      | ...         | ...      | ...                |

## Feature Catalog Coverage
| fc ID | Surface | Tested | Issues |
|-------|---------|--------|--------|
| sidebar-tree-expand | ... | ✅/❌ | ... |

## Detailed Findings
### [Component/Screen Name]
- **Expected:** ...
- **Actual:** ...
- **Screenshot reference:** (describe what was observed)
- **Severity:** critical/major/minor
```

Post the report as a comment on the current issue.

## Rules

- **Never modify the "Markup Dev" project.** It is the reference source of truth.
- **Be exhaustive.** Check every component, every screen, every interaction.
- **Do not delegate.** Perform all checks directly using Chrome browser tools.
- **Do not create sub-issues.** The report is the deliverable.
- You may create test projects, test data, or navigate freely in the live app — just don't touch "Markup Dev".
