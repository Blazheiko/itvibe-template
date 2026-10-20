import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const repoUrl = 'https://github.com/Blazheiko/itvibe-template'

const packagesItems = [
    { text: 'Пакет shared', link: '/shared/' },
    { text: 'Фронтенд', link: '/frontend/' },
    { text: 'API Playground', link: '/playground/' },
]

export default withMermaid(
    defineConfig({
        base: '/itvibe-template/',
        lang: 'uk-UA',
        title: 'itvibe-template',
        description:
            'Документація full-stack TypeScript шаблону: Vue 3, uWebSockets.js, shared контракти',
        cleanUrls: true,
        lastUpdated: true,
        ignoreDeadLinks: false,
        head: [['link', { rel: 'icon', href: '/itvibe-template/logo.svg' }]],
        themeConfig: {
            logo: '/logo.svg',
            nav: [
                { text: 'Гайд', link: '/guide/introduction' },
                { text: 'Бекенд', link: '/backend/' },
                {
                    text: 'Пакети',
                    items: [
                        { text: 'shared', link: '/shared/' },
                        { text: 'Фронтенд', link: '/frontend/' },
                        { text: 'API Playground', link: '/playground/' },
                    ],
                },
                { text: 'Довідник', link: '/reference/scripts' },
            ],
            sidebar: {
                '/guide/': [
                    {
                        text: 'Гайд',
                        items: [
                            { text: 'Вступ', link: '/guide/introduction' },
                            { text: 'Швидкий старт', link: '/guide/getting-started' },
                            { text: 'Структура проєкту', link: '/guide/project-structure' },
                        ],
                    },
                ],
                '/backend/': [
                    {
                        text: 'Бекенд',
                        items: [
                            { text: 'Огляд', link: '/backend/' },
                            { text: 'Архітектура', link: '/backend/architecture' },
                            { text: 'Життєвий цикл запиту', link: '/backend/request-lifecycle' },
                            { text: 'Конфігурація', link: '/backend/configuration' },
                            {
                                text: 'Контролери та сервіси',
                                link: '/backend/controllers-services',
                            },
                            {
                                text: 'Репозиторії та трансформери',
                                link: '/backend/repositories-transformers',
                            },
                            { text: 'Валідація', link: '/backend/validation' },
                            {
                                text: 'Маршрутизація та middleware',
                                link: '/backend/routing-middlewares',
                            },
                            { text: 'База даних', link: '/backend/database' },
                            { text: 'Автентифікація та безпека', link: '/backend/auth-security' },
                            { text: 'WebSocket', link: '/backend/websocket' },
                            { text: 'Тестування', link: '/backend/testing' },
                            { text: 'Кешування та ETag', link: '/backend/caching-etag' },
                            { text: 'Observability', link: '/backend/observability' },
                            { text: 'Деплой', link: '/backend/deployment' },
                        ],
                    },
                    {
                        text: 'Інтеграції',
                        items: [
                            { text: 'Сховище файлів (S3)', link: '/backend/storage' },
                            { text: 'Пошта та push', link: '/backend/mail-push' },
                            { text: 'AI-інтеграції', link: '/backend/ai' },
                        ],
                    },
                    {
                        text: 'Туторіали',
                        items: [{ text: 'Як додати фічу', link: '/backend/adding-a-feature' }],
                    },
                ],
                '/shared/': [{ text: 'Пакети', items: packagesItems }],
                '/frontend/': [{ text: 'Пакети', items: packagesItems }],
                '/playground/': [{ text: 'Пакети', items: packagesItems }],
                '/reference/': [
                    {
                        text: 'Довідник',
                        items: [{ text: 'Скрипти', link: '/reference/scripts' }],
                    },
                ],
            },
            search: { provider: 'local' },
            editLink: {
                pattern: `${repoUrl}/edit/main/documentation/:path`,
                text: 'Редагувати сторінку на GitHub',
            },
            socialLinks: [{ icon: 'github', link: repoUrl }],
            outline: { label: 'На цій сторінці' },
            docFooter: { prev: 'Попередня', next: 'Наступна' },
            lastUpdated: { text: 'Оновлено' },
        },
    }),
)
