---
layout: home

hero:
    name: itvibe-template
    text: Full-stack TypeScript шаблон
    tagline: Vue 3 + uWebSockets.js + спільні контракти. Документація з фокусом на бекенд.
    image:
        src: /logo.svg
        alt: itvibe-template
    actions:
        - theme: brand
          text: Почати
          link: /guide/getting-started
        - theme: alt
          text: Бекенд
          link: /backend/
        - theme: alt
          text: GitHub
          link: https://github.com/Blazheiko/itvibe-template

features:
    - title: Бекенд на uWebSockets.js
      details: Шарова архітектура route → middleware → controller → service → repository → transformer.
      link: /backend/architecture
    - title: Конфігурація через env
      details: Повний довідник змінних оточення з default-значеннями та файлами, що їх читають.
      link: /backend/configuration
    - title: Безпека з коробки
      details: Сесії в Redis з HMAC, CSRF, CORS-whitelist, security-заголовки, rate limiting і довірені проксі.
      link: /backend/auth-security
---
