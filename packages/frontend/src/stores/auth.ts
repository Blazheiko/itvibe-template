import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { AuthUser, LoginInput, LoginResponse, RegisterInput, RegisterResponse } from 'shared'
import { ApiError, authApi } from '@/api'

const guestUser: AuthUser = {
  id: '',
  name: 'Guest',
  email: '',
  emailVerified: false,
  emailVerifiedAt: null,
  role: 'user',
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const sessionInitialized = ref(false)
  const currentUser = reactive<AuthUser>({ ...guestUser })
  let initializeSessionPromise: Promise<void> | null = null

  function applyUser(user: AuthUser) {
    Object.assign(currentUser, guestUser, user)
    isAuthenticated.value = true
  }

  function resetUser() {
    Object.assign(currentUser, guestUser)
    isAuthenticated.value = false
  }

  function requireUser(
    user: Extract<LoginResponse, { status: 'success' }>['user'] | Extract<RegisterResponse, { status: 'success' }>['user'],
  ): AuthUser {
    if (user === undefined || user.name.trim() === '') {
      throw new Error('Auth response did not include a user payload')
    }

    return user
  }

  async function login(payload: LoginInput) {
    const response = await authApi.login(payload)
    applyUser(requireUser(response.user))
    return response
  }

  async function register(payload: RegisterInput) {
    const response = await authApi.register(payload)
    applyUser(requireUser(response.user))
    return response
  }

  async function logout() {
    await authApi.logout()
    resetUser()
  }

  async function initializeSession() {
    if (sessionInitialized.value) {
      return
    }

    if (initializeSessionPromise !== null) {
      await initializeSessionPromise
      return
    }

    initializeSessionPromise = (async () => {
      try {
        const response = await authApi.me()
        applyUser(response.user)
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          resetUser()
          return
        }
        console.error('Failed to initialize auth session', error)
      } finally {
        sessionInitialized.value = true
        initializeSessionPromise = null
      }
    })()

    await initializeSessionPromise
  }

  return {
    isAuthenticated,
    currentUser,
    login,
    register,
    logout,
    resetUser,
    initializeSession,
  }
})
