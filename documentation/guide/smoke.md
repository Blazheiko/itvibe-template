# Smoke-сторінка

Тимчасова сторінка каркаса (T1.7): перевіряє Mermaid, Markdown include і статичні зображення під
`base`. Буде замінена контентом v1 на етапі 4.

## Mermaid

```mermaid
sequenceDiagram
    participant C as Client
    participant S as uWS server
    participant R as Router
    C->>S: HTTP request
    S->>R: match route
    R-->>C: response
```

## Зображення

![Логотип](/logo.svg)

## Include

<!--@include: ../../packages/backend/src/scripts/README.md-->
