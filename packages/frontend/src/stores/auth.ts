import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type { LoginInput, LoginResponse, RegisterInput, RegisterResponse } from 'shared'
import { authApi, type AuthUser } from '@/api'

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
  const currentUser = reactive<AuthUser>({ ...guestUser })

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

  return { isAuthenticated, currentUser, login, register, logout, resetUser }
})
