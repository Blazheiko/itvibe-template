import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SocialAuthButtons from '../SocialAuthButtons.vue'
import { resetOAuthProviders } from '@/composables/useOAuthProviders'
import en from '../../locales/en'

const { getOAuthProvidersMock } = vi.hoisted(() => ({
    getOAuthProvidersMock: vi.fn(),
}))

vi.mock('@/utils/api', () => ({
    authApi: { getOAuthProviders: getOAuthProvidersMock },
}))

const mountButtons = async (props: { interceptClick?: boolean } = {}) => {
    const wrapper = mount(SocialAuthButtons, {
        props,
        global: {
            plugins: [createI18n({ legacy: false, locale: 'en', messages: { en } })],
        },
    })
    await flushPromises()
    return wrapper
}

const providersOf = (wrapper: Awaited<ReturnType<typeof mountButtons>>) =>
    wrapper.findAll('[data-provider]').map((button) => button.attributes('data-provider'))

afterEach(() => {
    resetOAuthProviders()
    vi.clearAllMocks()
})

describe('SocialAuthButtons', () => {
    it('shows a button for each configured provider', async () => {
        getOAuthProvidersMock.mockResolvedValue({
            data: { status: 'ok', providers: ['google', 'github'] },
            error: null,
        })

        const wrapper = await mountButtons()

        expect(providersOf(wrapper)).toEqual(['google', 'github'])
        expect(wrapper.find('[data-provider="github"]').attributes('href')).toBe(
            '/api/auth/oauth/github/redirect',
        )
    })

    it('renders nothing, not even the divider, when no provider is configured', async () => {
        getOAuthProvidersMock.mockResolvedValue({
            data: { status: 'ok', providers: [] },
            error: null,
        })

        const wrapper = await mountButtons()

        expect(wrapper.find('.social-divider').exists()).toBe(false)
        expect(providersOf(wrapper)).toEqual([])
    })

    it('renders nothing when the request fails and retries on the next mount', async () => {
        getOAuthProvidersMock.mockRejectedValueOnce(new Error('offline'))
        vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const first = await mountButtons()
        expect(providersOf(first)).toEqual([])

        getOAuthProvidersMock.mockResolvedValue({
            data: { status: 'ok', providers: ['gitlab'] },
            error: null,
        })
        const second = await mountButtons()

        expect(providersOf(second)).toEqual(['gitlab'])
        expect(getOAuthProvidersMock).toHaveBeenCalledTimes(2)
    })

    it('loads the list once for several instances', async () => {
        getOAuthProvidersMock.mockResolvedValue({
            data: { status: 'ok', providers: ['google'] },
            error: null,
        })

        await mountButtons()
        await mountButtons()

        expect(getOAuthProvidersMock).toHaveBeenCalledTimes(1)
    })

    it('hands the click to the parent when interceptClick is set', async () => {
        getOAuthProvidersMock.mockResolvedValue({
            data: { status: 'ok', providers: ['facebook'] },
            error: null,
        })

        const wrapper = await mountButtons({ interceptClick: true })
        await wrapper.find('[data-provider="facebook"]').trigger('click')

        expect(wrapper.emitted('select')).toEqual([['/api/auth/oauth/facebook/redirect']])
    })
})
