import { describe, expect, it, vi } from 'vitest'

const listAdminUsers = vi.fn()
vi.mock('#app/repositories/index.js', () => ({ userRepository: { listAdminUsers } }))

const { adminUserService } = await import('./admin-user-service.js')

describe('adminUserService.listUsers', () => {
    it('passes the filters through and maps rows to the response shape', async () => {
        listAdminUsers.mockResolvedValue({
            items: [
                { id: 5n, name: 'Ann', email: 'ann@example.test', createdAt: new Date(0) },
                { id: 6n, name: 'Bob', email: null, createdAt: new Date(1000) },
            ],
            total: 2,
        })
        const filters = { userId: 5n, limit: 10 }

        const result = await adminUserService.listUsers(filters)

        expect(listAdminUsers).toHaveBeenCalledWith(filters)
        expect(result).toEqual({
            items: [
                {
                    id: '5',
                    name: 'Ann',
                    email: 'ann@example.test',
                    registeredAt: '1970-01-01T00:00:00.000Z',
                },
                { id: '6', name: 'Bob', email: '', registeredAt: '1970-01-01T00:00:01.000Z' },
            ],
            total: 2,
        })
    })
})
