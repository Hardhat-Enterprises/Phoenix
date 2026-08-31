# Shared Components & Design Tokens

This document explains how to use the shared UI components, CSS utilities and design tokens in this frontend.

Where to find tokens

- Primary tokens live in `src/index.css` (colors, spacing, borders, shadows, typography).

Core guidelines

- Use the shared button classes: `btn`, `btn-primary`, `btn-secondary` for interactive actions. Do not style element selectors like `button` in page CSS.
- Mark required labels with the `label-required` utility. Add `aria-required="true"` to the corresponding input and link errors via `aria-describedby`.
- Rely on `:focus-visible` (global rules in `src/components/design.css`) for keyboard focus.
- Use `var(--focus-ring)` and `var(--interactive)` tokens when custom focus is needed.
- Prefer token names over literal hex values. If you need a new semantic color, add it to `src/index.css` and document its purpose here.

Accessibility checklist

- All form controls that can be required: add `aria-required="true"` and a visible `label` with `label-required`.
- When showing validation errors, render an element with `role="alert"` and a stable `id`, and set `aria-describedby` on the control to that `id`.
- Use `role="status"` for non-critical in-progress messages.

How to add a new shared component

1. Create the component under `src/components/`.
2. Add minimal presentational CSS to `src/components/<name>.css` and prefer utility tokens from `src/index.css`.
3. Add an example to the internal Component Showcase page at `src/pages/ComponentShowcase.jsx`.
4. Add usage notes to this file.

Design decisions

- Use token-driven values for all visual rules. Keep page-level CSS focused on layout only (spacing, widths, grid placement).
- Favor class-based selectors to avoid specificity conflicts with tokenized styles.

Contact

- Add notes or missing patterns to this file so the team can evolve the shared conventions.
