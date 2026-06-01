# Privacy and Compliance Requirements: itvibe-template

Last updated: 2026-05-30

## 1. Current Privacy Surface

The template includes public privacy, terms, cookies, and AI/content policy pages. It
also stores user, auth, presence, push, support chat, and AI usage data.

## 2. Data Subject Capabilities

| ID       | Status          | Requirement                                                                                                                |
| -------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| PRIV-001 | Extension point | Authenticated users should be able to request or download an export of their account data.                                 |
| PRIV-002 | Extension point | Authenticated users should be able to request account deletion or anonymization, subject to product/legal retention needs. |
| PRIV-003 | Extension point | Users should be able to revoke optional push notification consent.                                                         |
| PRIV-004 | Extension point | Cookie consent should be explicit where non-essential cookies or tracking are added.                                       |

## 3. Data Retention

| ID           | Status | Requirement                                                                                                       |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| PRIV-RET-001 | Target | Presence history retention should be documented and configurable before production launch.                        |
| PRIV-RET-002 | Target | Support chat retention should be documented and configurable before production launch.                            |
| PRIV-RET-003 | Target | AI usage retention should be documented and configurable before production launch.                                |
| PRIV-RET-004 | Target | Deleted user media should be removed from S3-compatible storage or made inaccessible according to product policy. |

## 4. AI and Support Disclosure

| ID          | Status              | Requirement                                                                                                                                |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PRIV-AI-001 | Implemented pattern | The frontend includes AI/content policy surfaces and AI disclosure UI.                                                                     |
| PRIV-AI-002 | Target              | AI-generated support content should disclose that it may be inaccurate and should not be treated as authoritative for high-risk decisions. |
| PRIV-AI-003 | Target              | Support AI prompts and usage records should avoid storing secrets or unnecessary personal data.                                            |
