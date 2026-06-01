# Glossary: itvibe-template

Last updated: 2026-05-30

| Term                    | Meaning                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| API playground          | A developer/QA Vue app that reads backend route metadata and helps test HTTP/WebSocket endpoints.                  |
| Branded type            | A TypeScript type pattern used to distinguish semantically different primitive values, such as IDs.                |
| CSRF                    | Cross-site request forgery. The template uses synchronizer-token protection for cookie-backed unsafe requests.     |
| Embedding               | A vector representation of text used for support knowledge base search and retrieval.                              |
| Knowledge base          | Admin-managed support articles used by the support and AI workflows.                                               |
| Presence                | Runtime state that tracks which authenticated users are currently connected over WebSocket.                        |
| Retained prompt         | A persisted AI prompt configuration that administrators can edit and test.                                         |
| Session                 | Redis-backed authenticated browser state represented by an HTTP-only cookie.                                       |
| Support chat            | WebSocket-backed chat flow between a user and the support agent logic.                                             |
| Synchronizer-token CSRF | A CSRF model where the server stores a token in session state and the client sends it in an unsafe request header. |
| VAPID                   | Web Push identity key pair used for browser push notifications.                                                    |
| WebSocket token         | A token returned by authenticated app initialization or refresh so the frontend can open real-time connections.    |
