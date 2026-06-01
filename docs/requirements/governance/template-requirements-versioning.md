# Requirements Versioning and Status: itvibe-template

Last updated: 2026-05-30

## 1. Status Model

| Status              | Meaning                                                                              |
| ------------------- | ------------------------------------------------------------------------------------ |
| Implemented         | The capability is represented in the current codebase.                               |
| Implemented default | The current codebase provides a default behavior or value.                           |
| Target              | The requirement defines a production baseline that should be validated or completed. |
| Extension point     | The template intentionally leaves this to downstream products or future hardening.   |
| Planned             | The requirement is expected but not yet scheduled in this repository.                |

## 2. Requirement ID Rules

- Requirement IDs should be stable once published.
- Do not reuse an ID for a different behavior.
- If a requirement is removed, mark it deprecated in the changelog rather than silently reassigning its ID.
- Suffix IDs such as `FR-FE-003A` may be used for inserted requirements that extend an existing numbered item.

## 3. Current Status Summary

| Document                        | Status                                                             |
| ------------------------------- | ------------------------------------------------------------------ |
| Functional requirements         | Implemented and extension-point mix                                |
| Non-functional requirements     | Baseline added, several production targets remain extension points |
| Acceptance criteria             | Initial QA-readable coverage for critical flows                    |
| Prioritization                  | Initial MoSCoW classification                                      |
| Error handling requirements     | Initial edge-case requirements                                     |
| Session/token lifecycle         | Initial lifecycle requirements                                     |
| Accessibility requirements      | Baseline targets added                                             |
| Privacy/compliance requirements | Extension-point requirements added                                 |
| Observability requirements      | Implemented logging/Sentry plus health/readiness extension points  |
| Localization requirements       | Frontend implemented, backend localization extension points        |

## 4. Changelog

| Date       | Change                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-05-30 | Added functional requirements document.                                                                                                                                                                            |
| 2026-05-30 | Added OAuth, account linking, logout-all, redirect, and init/save-user clarifications.                                                                                                                             |
| 2026-05-30 | Renumbered frontend requirement headings after removed notes/news item.                                                                                                                                            |
| 2026-05-30 | Added NFR, acceptance criteria, prioritization, edge-case, lifecycle, accessibility, privacy, observability, localization, constraints, glossary, role matrix, dependency, versioning, and feature flag documents. |
