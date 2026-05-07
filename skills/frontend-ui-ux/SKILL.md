---
name: frontend-ui-ux
description: Frontend UI/UX design guidance — component design, layout, accessibility, and visual polish
aliases: [frontend-ui, ui-ux]
level: 5
---

# Frontend UI/UX Skill

Design and implement high-quality frontend components with attention to layout, accessibility, visual hierarchy, and user experience.

## Trigger Keywords

- "frontend-ui-ux", "frontend-ui", "ui-ux", "设计组件", "design component", "UI design", "UX design"

## Design Principles

### 1. Visual Hierarchy

- Use size, weight, and color to guide the user's eye
- Most important content is most prominent
- Related items are visually grouped
- White space is intentional — not filler

### 2. Accessibility First

Every component must:

- Have semantic HTML (`<button>`, `<nav>`, `<main>`, not just `<div>`)
- Support keyboard navigation (Tab, Enter, Escape, arrow keys)
- Have sufficient color contrast (WCAG AA: 4.5:1 for text, 3:1 for large text)
- Include ARIA labels where native semantics are insufficient
- Work with screen readers (test with VoiceOver / NVDA mental model)

### 3. Responsive Layout

- Mobile-first: design for small screens, then expand
- Use CSS Grid for 2D layouts, Flexbox for 1D
- Avoid fixed pixel widths; use `rem`, `%`, `clamp()`
- Test at 320px, 768px, 1024px, 1440px breakpoints

### 4. Interaction Design

- All interactive elements have visible focus states
- Hover/active states provide feedback
- Loading states are explicit (skeleton, spinner, or progress)
- Error states are clear and actionable
- Transitions are purposeful (≤300ms, ease-in-out)

### 5. Color System

Use design tokens, not raw hex values:

```css
/* Prefer */
color: var(--color-text-primary);
background: var(--color-surface);

/* Avoid */
color: #1a1a1a;
background: #ffffff;
```

## Implementation Protocol

### Step 1: Understand Requirements

Before writing any code, clarify:
- What is the component's purpose?
- Who uses it, and in what context?
- What are the states (empty, loading, error, populated)?
- What devices/browsers must it support?

### Step 2: Design the Structure

Sketch the HTML structure first:
```html
<!-- Semantic, accessible, minimal -->
<article class="card">
  <header class="card__header">...</header>
  <main class="card__body">...</main>
  <footer class="card__footer">...</footer>
</article>
```

### Step 3: Style with Constraints

Follow the project's design system. If none exists, establish minimal tokens:

```css
:root {
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
}
```

### Step 4: Add Behavior

- Keep JS minimal — prefer CSS for animation and transitions
- Use event delegation where possible
- Avoid layout thrashing (batch DOM reads/writes)

### Step 5: Review Checklist

Before marking done:

- [ ] Renders correctly at all breakpoints
- [ ] Keyboard navigable
- [ ] Screen reader announces correctly
- [ ] Color contrast passes WCAG AA
- [ ] All states (empty, loading, error, populated) are handled
- [ ] No console warnings or errors
- [ ] Matches design intent (if mockup provided)

## Component Patterns

### Form Inputs

```html
<div class="field">
  <label for="email" class="field__label">Email address</label>
  <input
    id="email"
    type="email"
    class="field__input"
    aria-required="true"
    aria-describedby="email-hint email-error"
  />
  <p id="email-hint" class="field__hint">We'll never share your email.</p>
  <p id="email-error" class="field__error" role="alert" hidden>
    Please enter a valid email address.
  </p>
</div>
```

### Modal Dialogs

```html
<dialog class="modal" aria-labelledby="modal-title">
  <header class="modal__header">
    <h2 id="modal-title">Confirm action</h2>
    <button class="modal__close" aria-label="Close dialog">×</button>
  </header>
  <div class="modal__body">...</div>
  <footer class="modal__footer">
    <button type="button" class="btn btn--secondary">Cancel</button>
    <button type="button" class="btn btn--primary">Confirm</button>
  </footer>
</dialog>
```

### Loading States

```html
<!-- Skeleton screen (preferred over spinners for content) -->
<div class="card card--loading" aria-busy="true" aria-label="Loading content">
  <div class="skeleton skeleton--title"></div>
  <div class="skeleton skeleton--text"></div>
  <div class="skeleton skeleton--text skeleton--short"></div>
</div>
```

## Framework-Specific Notes

### React

- Prefer `useId()` for accessible label/input associations
- Use `React.memo()` only when profiling shows it's needed
- CSS Modules or Tailwind for scoped styles

### Vue

- Use `<template>` fragments to avoid wrapper divs
- `v-bind` ARIA attributes reactively based on component state

### Svelte

- `transition:` directives for accessible motion (respects `prefers-reduced-motion`)
- `bind:this` for focus management

## Deliverable Format

For each component, provide:

1. **HTML structure** (semantic, accessible)
2. **CSS** (scoped, using design tokens)
3. **JS/framework code** (minimal, event-driven)
4. **Usage example**
5. **Accessibility notes** (keyboard behavior, ARIA, contrast)
