<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const welcomeTitle = computed(() =>
  auth.isAuthenticated ? `Welcome back, ${auth.currentUser.name}` : 'Access your account hub',
)
</script>

<template>
  <div class="auth-shell">
    <section class="hero-panel">
      <p class="eyebrow">ITVIBE ACCESS</p>
      <h1>{{ welcomeTitle }}</h1>
      <p class="hero-copy">
        Secure onboarding, social sign-in preparation, password recovery and a calm post-login
        landing view in one focused flow.
      </p>

      <div class="hero-card">
        <span class="hero-card-label">Flow map</span>
        <ul class="flow-list">
          <li>Register a new account</li>
          <li>Return with email and password</li>
          <li>Recover access from forgot password</li>
          <li>Land on a private welcome screen</li>
        </ul>
      </div>

      <div class="hero-footer">
        <div>
          <span class="metric">24/7</span>
          <span class="metric-label">account access</span>
        </div>
        <div>
          <span class="metric">1 hub</span>
          <span class="metric-label">all auth actions</span>
        </div>
      </div>
    </section>

    <section class="form-panel">
      <nav v-if="$slots.nav" class="form-nav">
        <slot name="nav" />
      </nav>
      <div class="form-center">
        <slot />
      </div>
    </section>
  </div>
</template>
