vendor/utils/
├── context/
│ ├── http-context.ts
│ └── ws-context.ts
├── routing/
│ ├
│ ├── ws-api-dispatcher.ts
│ └── serialize-routes.ts
├── rate-limit/
│ ├── rate-limit-store.ts     # in-memory store (sliding log / fixed window)
│ ├── upgrade-rate-limit.ts   # WS upgrade per-IP limit
│ ├── http-rate-limit.ts
│ └── ws-rate-limit.ts
├── middlewares/
│ ├── core/
│ │ ├── execute-middlewares.ts
│ │ └── auth-guard.ts
│ ├── http/
│ │ └── session-api.ts
│ └── ws/
│ └── session-web.ts
├── network/
│ ├── get-ip.ts
│ └── http-request-handlers.ts
├── serialization/
│ └── serialize-model.ts
├── tooling/
│ └── parse-types-from-dts.ts
└── session/
├── session-handler.ts
└── get-redis-session-storage.ts
