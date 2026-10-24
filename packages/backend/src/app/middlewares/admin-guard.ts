import type { HttpContext, Middleware } from '#vendor/types/types.js'
import { userRoleService } from '#app/services/user/user-role-service.js'

const adminGuard: Middleware = async (
    context: HttpContext,
    next: () => Promise<void>,
): Promise<void> => {
    const userId = context.auth.getUserId()
    if (userId === null) {
        context.responseData.status = 403
        context.responseData.payload = { status: 'forbidden', message: 'Admin access required' }
        return
    }
    const role = await userRoleService.findRole(BigInt(userId))
    if (role !== 'admin') {
        context.responseData.status = 403
        context.responseData.payload = { status: 'forbidden', message: 'Admin access required' }
        return
    }
    await next()
}

export default adminGuard
