import { adminUserService } from '#app/services/admin/admin-user-service.js'
import { mapControllerError } from '#app/controllers/shared/controller-error.js'
import { badRequest } from '#app/services/shared/errors.js'
import type { HttpContext } from '#vendor/types/types.js'
import type { AdminUserListQuery } from 'shared/schemas'
import type { AdminUserListResponse } from 'shared/responses'

export default {
    async list(context: HttpContext<unknown, AdminUserListQuery>): Promise<AdminUserListResponse> {
        const query = context.httpData.query

        let userId: bigint | undefined
        if (query.userId !== undefined && query.userId !== '') {
            if (!/^\d+$/.test(query.userId)) {
                return mapControllerError(context, badRequest('userId must be a numeric string'))
            }
            userId = BigInt(query.userId)
        }

        const filters = {
            ...(userId !== undefined && { userId }),
            ...(query.dateFrom !== undefined && { dateFrom: query.dateFrom }),
            ...(query.dateTo !== undefined && { dateTo: query.dateTo }),
            limit: query.limit,
        }

        const result = await adminUserService.listUsers(filters)

        return { status: 'success', items: result.items, total: result.total }
    },
}
