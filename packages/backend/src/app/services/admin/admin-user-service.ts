import { userRepository } from '#app/repositories/index.js'
import type { AdminUserListFilters } from '#app/repositories/index.js'

export interface AdminUserListItem {
    id: string
    name: string
    email: string
    registeredAt: string
}

export const adminUserService = {
    async listUsers(
        filters: AdminUserListFilters,
    ): Promise<{ items: AdminUserListItem[]; total: number }> {
        const result = await userRepository.listAdminUsers(filters)
        return {
            items: result.items.map((user) => ({
                id: String(user.id),
                name: user.name,
                email: user.email ?? '',
                registeredAt: user.createdAt.toISOString(),
            })),
            total: result.total,
        }
    },
}
