# Accessibility Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Baseline Standard

| ID       | Status | Requirement                                                                                        |
| -------- | ------ | -------------------------------------------------------------------------------------------------- |
| A11Y-001 | Target | User-facing frontend screens should meet WCAG 2.2 AA unless a documented product exception exists. |
| A11Y-002 | Target | Interactive controls should be keyboard reachable and operable without pointer input.              |
| A11Y-003 | Target | Focus order should match visual order and should remain visible in light and dark themes.          |
| A11Y-004 | Target | Text and meaningful UI controls should meet AA contrast ratios in all built-in themes.             |

## 2. Semantic UI

| ID           | Status | Requirement                                                                                                             |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| A11Y-SEM-001 | Target | Forms should use labels or accessible names for inputs, including auth, account, support, and admin forms.              |
| A11Y-SEM-002 | Target | Modals should trap focus, expose a dialog role/name, and return focus to the opener on close.                           |
| A11Y-SEM-003 | Target | Loading, error, toast, and update states should be announced through accessible text or live regions where appropriate. |
| A11Y-SEM-004 | Target | Icon-only buttons should have accessible names.                                                                         |

## 3. QA Checks

Recommended checks:

- keyboard-only navigation through auth, account, support, and admin pages
- screen reader smoke test for auth modal and account settings
- automated accessibility scan in Playwright for critical pages
- contrast check for built-in color themes
