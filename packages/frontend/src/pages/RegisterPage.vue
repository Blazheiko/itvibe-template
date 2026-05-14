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

const form = reactive({ fullName: '', email: '', password: '', confirmPassword: '' })
const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Passwords do not match'
    return
  }

  isSubmitting.value = true

  try {
    await auth.register({
      name: form.fullName,
      email: form.email,
      password: form.password,
    })
    await router.push('/dashboard')
  } catch (error) {
    errorMessage.value = formatApiError(error, 'Registration failed')
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
        <h2>Create your account</h2>
        <p>Prepare a clean registration path for new users.</p>
      </div>

      <label class="field">
        <span>Full name</span>
        <input v-model="form.fullName" type="text" placeholder="Alex Blazheiko" required />
      </label>

      <label class="field">
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="name@domain.com" required />
      </label>

      <div class="field-grid">
        <label class="field">
          <span>Password</span>
          <input v-model="form.password" type="password" placeholder="Minimum 8 characters" required />
        </label>

        <label class="field">
          <span>Confirm password</span>
          <input v-model="form.confirmPassword" type="password" placeholder="Repeat password" required />
        </label>
      </div>

      <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Creating account...' : 'Register' }}
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
        Already have an account?
        <RouterLink class="inline-action" to="/login">Back to login</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>
