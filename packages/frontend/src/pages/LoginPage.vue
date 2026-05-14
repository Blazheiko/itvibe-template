<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, OAUTH_PROVIDERS, type OAuthProvider } from '@/api'
import { formatApiError } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import OAuthProviderIcon from '@/components/auth/OAuthProviderIcon.vue'

const router = useRouter()
const auth = useAuthStore()
const oauthProviders = OAUTH_PROVIDERS

const form = reactive({ email: '', password: '' })
const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await auth.login({
      email: form.email,
      password: form.password,
    })
    await router.push('/dashboard')
  } catch (error) {
    errorMessage.value = formatApiError(error, 'Login failed')
  } finally {
    isSubmitting.value = false
  }
}

function handleOAuthClick(provider: OAuthProvider) {
  authApi.redirectToOAuthProvider(provider)
}
</script>

<template>
  <AuthLayout>
    <template #nav>
      <RouterLink class="tab" active-class="active" to="/login">Login</RouterLink>
      <RouterLink class="tab" active-class="active" to="/register">Register</RouterLink>
      <RouterLink class="tab" active-class="active" to="/forgot-password">Forgot password</RouterLink>
    </template>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="form-heading">
        <h2>Welcome back</h2>
        <p>Sign in to continue to your private workspace.</p>
      </div>

      <label class="field">
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="you@company.com" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="form.password" type="password" placeholder="Enter your password" required />
      </label>

      <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Signing in...' : 'Login' }}
      </button>

      <div class="oauth-actions">
        <button
          v-for="provider in oauthProviders"
          :key="provider"
          class="secondary-button oauth-button"
          type="button"
          @click="handleOAuthClick(provider)"
        >
          <OAuthProviderIcon :provider="provider" />
          <span>{{ provider }}</span>
        </button>
      </div>

      <p class="form-note">
        Need access instead?
        <RouterLink class="inline-action" to="/register">Create an account</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>
