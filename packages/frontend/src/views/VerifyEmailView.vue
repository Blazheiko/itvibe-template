<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi, mainApi } from '@/utils/api'
import { useUserStore, type User } from '@/stores/user'

defineOptions({
    name: 'VerifyEmailView',
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const userStore = useUserStore()

const status = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('')

const token = computed(() => {
    const rawToken = route.query['token']
    return typeof rawToken === 'string' ? rawToken.trim() : ''
})

async function verifyEmail(): Promise<void> {
    if (token.value === '') {
        status.value = 'error'
        message.value = t('emailVerification.invalid')
        return
    }

    status.value = 'loading'
    message.value = ''

    const { data, error } = await authApi.verifyEmail({ token: token.value })
    if (error) {
        status.value = 'error'
        message.value = error.message || t('emailVerification.invalid')
        return
    }

    if (data?.status !== 'success') {
        status.value = 'error'
        message.value = data?.message || t('emailVerification.invalid')
        return
    }

    status.value = 'success'
    message.value = data.message || t('emailVerification.success')

    if (userStore.user) {
        const { data: initData, error: initError } = await mainApi.init()
        if (!initError && initData?.user) {
            userStore.setUser(initData.user as User)
        }
    }
}

function goToAccount(): void {
    void router.push({ name: 'UserAccount' })
}

function goToLogin(): void {
    void router.push({ name: 'Login' })
}

function handleSuccessAction(): void {
    if (userStore.user) {
        goToAccount()
        return
    }

    goToLogin()
}

onMounted(() => {
    void verifyEmail()
})
</script>

<template>
    <div class="verify-email-page">
        <div class="verify-email-card">
            <p v-if="status === 'loading'" class="verify-email-state">
                {{ t('emailVerification.loading') }}
            </p>

            <template v-else-if="status === 'success'">
                <h1>{{ t('emailVerification.successTitle') }}</h1>
                <p class="verify-email-message">{{ message }}</p>
                <div class="verify-email-actions">
                    <button class="verify-email-primary" @click="handleSuccessAction">
                        {{
                            userStore.user
                                ? t('emailVerification.openAccount')
                                : t('emailVerification.goToLogin')
                        }}
                    </button>
                </div>
            </template>

            <template v-else>
                <h1>{{ t('emailVerification.errorTitle') }}</h1>
                <p class="verify-email-message">{{ message }}</p>
                <div class="verify-email-actions">
                    <button class="verify-email-primary" @click="goToLogin">
                        {{ t('emailVerification.goToLogin') }}
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped>
.verify-email-page {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background:
        radial-gradient(
            circle at top,
            color-mix(in srgb, var(--accent-color) 12%, transparent),
            transparent 42%
        ),
        linear-gradient(180deg, var(--bg-primary), var(--surface-color));
}

.verify-email-card {
    width: min(100%, 520px);
    padding: 32px;
    border-radius: 20px;
    background: var(--surface-color);
    box-shadow: var(--shadow-md);
    text-align: center;
}

.verify-email-card h1 {
    margin: 0 0 12px;
    color: var(--text-primary);
    font-size: 2rem;
}

.verify-email-state,
.verify-email-message {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
}

.verify-email-actions {
    margin-top: 24px;
    display: flex;
    justify-content: center;
}

.verify-email-primary {
    border: none;
    border-radius: 12px;
    background: var(--primary-color);
    color: #fff;
    padding: 12px 18px;
    font-weight: 600;
    cursor: pointer;
}

.verify-email-primary:hover {
    background: var(--primary-hover);
}
</style>
