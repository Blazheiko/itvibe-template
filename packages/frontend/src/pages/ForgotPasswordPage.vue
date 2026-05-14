<script setup lang="ts">
import { reactive, ref } from 'vue'
import AuthLayout from '@/components/auth/AuthLayout.vue'
import { authApi } from '@/api'
import { formatApiError } from '@/api/http'

const form = reactive({ email: '' })
const recoverySent = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''
  recoverySent.value = false
  isSubmitting.value = true

  try {
    await authApi.forgotPassword({ email: form.email })
    recoverySent.value = true
  } catch (error) {
    errorMessage.value = formatApiError(error, 'Failed to send recovery link')
  } finally {
    isSubmitting.value = false
  }
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
        <h2>Reset access</h2>
        <p>We will send password recovery instructions to the email below.</p>
      </div>

      <label class="field">
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="recovery@domain.com" required />
      </label>

      <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>

      <button class="primary-button" type="submit" :disabled="isSubmitting">
        {{ isSubmitting ? 'Sending...' : 'Send recovery link' }}
      </button>

      <p v-if="recoverySent" class="success-note">
        Recovery email prepared for {{ form.email }}.
      </p>

      <p class="form-note">
        Remembered your password?
        <RouterLink class="inline-action" to="/login">Return to login</RouterLink>
      </p>
    </form>
  </AuthLayout>
</template>
