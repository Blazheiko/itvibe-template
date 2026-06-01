# Localization Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Frontend Localization

| ID          | Status              | Requirement                                                                                              |
| ----------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| L10N-FE-001 | Implemented default | The frontend uses vue-i18n and locale files under `packages/frontend/src/locales`.                       |
| L10N-FE-002 | Target              | User-visible frontend strings should be added through locale files rather than hard-coded in components. |
| L10N-FE-003 | Target              | Dates, times, and numbers should be formatted through locale-aware browser APIs where practical.         |
| L10N-FE-004 | Target              | Language selection should persist across sessions when product requirements need explicit user choice.   |

## 2. Backend Localization

| ID          | Status          | Requirement                                                                                                                    |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| L10N-BE-001 | Extension point | Backend validation and business error codes should be machine-readable so frontend copy can be localized.                      |
| L10N-BE-002 | Extension point | Transactional emails should support localized templates before multilingual production use.                                    |
| L10N-BE-003 | Extension point | Support AI prompts should define the expected language policy for user messages, translation, and responses.                   |
| L10N-BE-004 | Target          | Server-generated timestamps should be returned in stable machine-readable formats, with display formatting handled by clients. |

## 3. Time Zones

| ID          | Status | Requirement                                                                                               |
| ----------- | ------ | --------------------------------------------------------------------------------------------------------- |
| L10N-TZ-001 | Target | Stored timestamps should remain timezone-safe and should be rendered according to user or browser locale. |
| L10N-TZ-002 | Target | Admin filters using dates should document whether boundaries are local dates or UTC instants.             |
