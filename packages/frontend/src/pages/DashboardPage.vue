<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/auth/AuthLayout.vue'

const router = useRouter()
const auth = useAuthStore()
const isSubmitting = ref(false)
const errorMessage = ref('')

async function signOut() {
  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await auth.logout()
    await router.push('/login')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Sign out failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <div class="welcome-panel">
      <p class="eyebrow">PRIVATE AREA</p>
      <h2>{{ auth.currentUser.name }}, you are inside.</h2>
      <p class="welcome-copy">
        This is the post-auth welcome state. Replace it later with dashboard widgets, onboarding
        steps or profile actions.
      </p>

      <div class="welcome-grid">
        <article class="welcome-card">
          <span class="card-kicker">Profile</span>
          <strong>{{ auth.currentUser.email }}</strong>
          <p>Primary account email ready for verification and recovery flows.</p>
        </article>

        <article class="welcome-card">
          <span class="card-kicker">Next step</span>
          <strong>Connect social auth</strong>
          <p>Reserve this block for Google or other provider entry points.</p>
        </article>
      </div>

      <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>

      <button class="secondary-button" type="button" :disabled="isSubmitting" @click="signOut">
        {{ isSubmitting ? 'Signing out...' : 'Sign out' }}
      </button>
    </div>
  </AuthLayout>
</template>
