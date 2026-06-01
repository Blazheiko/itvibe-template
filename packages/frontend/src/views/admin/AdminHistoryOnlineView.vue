<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminUserDetailModal from '@/components/admin/AdminUserDetailModal.vue'
import { adminOnlineHistoryApi, adminOnlineUsersApi } from '@/utils/api'
import type { AdminOnlineHistoryListItem, AdminOnlineUserDetail } from 'shared/responses'
import { getResponseMessage } from '@/utils/response-normalizer'

interface HistoryFilters {
  userId: string
  dateFrom: string
  dateTo: string
}

const PAGE_LIMIT = 100

const records = ref<AdminOnlineHistoryListItem[]>([])
const total = ref(0)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const filters = ref<HistoryFilters>({
  userId: '',
  dateFrom: '',
  dateTo: '',
})

const isModalOpen = ref(false)
const selectedUser = ref<AdminOnlineUserDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)

function getFilterParams(cursor?: string) {
  return {
    limit: PAGE_LIMIT,
    ...(cursor !== undefined && cursor !== '' ? { cursor } : {}),
    ...(filters.value.userId.trim() !== '' ? { userId: filters.value.userId.trim() } : {}),
    ...(filters.value.dateFrom !== '' ? { dateFrom: filters.value.dateFrom } : {}),
    ...(filters.value.dateTo !== '' ? { dateTo: filters.value.dateTo } : {}),
  }
}

async function loadHistory(reset = false) {
  if (reset) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  error.value = null

  const res = await adminOnlineHistoryApi.list(getFilterParams(reset ? undefined : (nextCursor.value ?? undefined)))

  loading.value = false
  loadingMore.value = false

  if (res.data?.status === 'success') {
    records.value = reset ? res.data.items : [...records.value, ...res.data.items]
    total.value = res.data.total
    nextCursor.value = res.data.nextCursor
    hasMore.value = res.data.hasMore
    return
  }

  if (reset) {
    records.value = []
    total.value = 0
    nextCursor.value = null
    hasMore.value = false
  }

  error.value = getResponseMessage(res.data, res.error?.message ?? 'Failed to load online history')
}

function applyFilters() {
  void loadHistory(true)
}

function resetFilters() {
  filters.value = {
    userId: '',
    dateFrom: '',
    dateTo: '',
  }
  void loadHistory(true)
}

async function openUserModal(userId: string) {
  isModalOpen.value = true
  detailLoading.value = true
  detailError.value = null
  selectedUser.value = null

  const res = await adminOnlineUsersApi.getById(userId)
  detailLoading.value = false

  if (res.data?.status === 'success') {
    selectedUser.value = res.data.user
    return
  }

  detailError.value = res.error?.message ?? 'Failed to load user details'
}

function closeModal() {
  isModalOpen.value = false
  selectedUser.value = null
  detailLoading.value = false
  detailError.value = null
}

function formatDate(value: string | null): string {
  if (value === null) return '—'
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(value: number | null, disconnectedAt: string | null): string {
  if (disconnectedAt === null) return 'Active'
  if (value === null) return '—'

  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatAppType(appType: 'web' | 'pwa' | null): string {
  if (appType === null) return '—'
  return appType.toUpperCase()
}

onMounted(() => {
  void loadHistory(true)
})
</script>

<template>
  <div class="admin-history">
    <div class="admin-history__header">
      <div>
        <h1 class="admin-history__title">History Online</h1>
        <p class="admin-history__subtitle">Socket connection history with newest records first</p>
      </div>
      <div class="admin-history__meta">Loaded: {{ records.length }} / {{ total }}</div>
    </div>

    <form class="filters-card" @submit.prevent="applyFilters">
      <div class="filters-grid">
        <div class="form-field">
          <label class="form-label">User ID</label>
          <input v-model="filters.userId" class="form-input" inputmode="numeric" placeholder="e.g. 123" />
        </div>

        <div class="form-field">
          <label class="form-label">Connected from</label>
          <input v-model="filters.dateFrom" class="form-input" type="date" />
        </div>

        <div class="form-field">
          <label class="form-label">Connected to</label>
          <input v-model="filters.dateTo" class="form-input" type="date" />
        </div>

      </div>

      <div class="filters-actions">
        <button class="btn btn--primary" type="submit" :disabled="loading || loadingMore">
          {{ loading ? 'Loading...' : 'Apply' }}
        </button>
        <button class="btn" type="button" :disabled="loading || loadingMore" @click="resetFilters">Reset</button>
      </div>
    </form>

    <div v-if="loading" class="admin-history__loading">Loading history...</div>
    <div v-else-if="error !== null && records.length === 0" class="admin-history__error">{{ error }}</div>

    <div v-else class="table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>User ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>App Type</th>
            <th>Connected At</th>
            <th>Disconnected At</th>
            <th>Duration</th>
            <th>Close Code</th>
            <th>First</th>
            <th>Last</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in records"
            :key="record.id"
            class="history-table__row"
            @click="openUserModal(record.userId)"
          >
            <td class="cell-id">{{ record.userId }}</td>
            <td>{{ record.name }}</td>
            <td class="cell-email">{{ record.email }}</td>
            <td>{{ formatAppType(record.appType) }}</td>
            <td>{{ formatDate(record.connectedAt) }}</td>
            <td>{{ formatDate(record.disconnectedAt) }}</td>
            <td>{{ formatDuration(record.connectionDurationMs, record.disconnectedAt) }}</td>
            <td>{{ record.closeCode ?? '—' }}</td>
            <td>
              <span :class="['flag-badge', record.isFirstConnection ? 'flag-badge--yes' : 'flag-badge--no']">
                {{ record.isFirstConnection ? 'Yes' : 'No' }}
              </span>
            </td>
            <td>
              <span v-if="record.isLastConnection === null" class="flag-badge flag-badge--pending">—</span>
              <span
                v-else
                :class="['flag-badge', record.isLastConnection ? 'flag-badge--yes' : 'flag-badge--no']"
              >
                {{ record.isLastConnection ? 'Yes' : 'No' }}
              </span>
            </td>
          </tr>
          <tr v-if="records.length === 0">
            <td colspan="10" class="empty-row">No history found</td>
          </tr>
        </tbody>
      </table>

      <div v-if="error !== null && records.length > 0" class="admin-history__error admin-history__error--inline">
        {{ error }}
      </div>

      <div v-if="hasMore" class="load-more-wrap">
        <button class="btn btn--primary" type="button" :disabled="loadingMore" @click="loadHistory(false)">
          {{ loadingMore ? 'Loading...' : 'Load more' }}
        </button>
      </div>
    </div>

    <AdminUserDetailModal
      :open="isModalOpen"
      :loading="detailLoading"
      :error="detailError"
      :user="selectedUser"
      @close="closeModal"
    />
  </div>
</template>

<style scoped>
.admin-history {
  padding: 24px;
  color: var(--text-primary);
}

.admin-history__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.admin-history__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.admin-history__subtitle {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.admin-history__meta,
.admin-history__loading,
.admin-history__error {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.filters-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 20px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  width: 100%;
  box-sizing: border-box;
}

.filters-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

.btn {
  appearance: none;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
}

.btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-color) 6%, var(--bg-primary));
  border-color: color-mix(in srgb, var(--accent-color) 35%, var(--border-color));
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-color) 88%, black);
  border-color: color-mix(in srgb, var(--accent-color) 88%, black);
}

.table-wrap {
  overflow-x: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.history-table th,
.history-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  vertical-align: middle;
}

.history-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

.history-table__row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.history-table__row:hover {
  background: color-mix(in srgb, var(--accent-color) 6%, transparent);
}

.cell-id {
  font-family: monospace;
  color: var(--text-secondary);
}

.cell-email {
  min-width: 220px;
}

.cell-empty {
  color: var(--text-secondary);
}

.flag-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.flag-badge--yes {
  background: color-mix(in srgb, var(--success, #2e7d52) 12%, transparent);
  color: var(--success, #2e7d52);
}

.flag-badge--no,
.flag-badge--pending {
  background: color-mix(in srgb, var(--text-secondary) 15%, transparent);
  color: var(--text-secondary);
}

.empty-row {
  text-align: center;
  color: var(--text-secondary);
  padding: 28px;
}

.admin-history__error--inline {
  margin-top: 16px;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 900px) {
  .admin-history {
    padding: 16px;
  }

  .admin-history__header {
    flex-direction: column;
  }
}
</style>
