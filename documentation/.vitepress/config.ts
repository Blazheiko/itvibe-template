import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const repoUrl = 'https://github.com/Blazheiko/itvibe-template'

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
                { text: 'Гайд', link: '/guide/smoke' },
                { text: 'Бекенд', link: '/guide/smoke' },
            ],
            sidebar: {
                '/guide/': [
                    {
                        text: 'Гайд',
                        items: [{ text: 'Smoke-сторінка', link: '/guide/smoke' }],
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
