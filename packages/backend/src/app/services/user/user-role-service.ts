import { userRepository } from '#app/repositories/index.js'
import type { UserRow } from '#app/repositories/index.js'

export const userRoleService = {
    // `undefined` when the user no longer exists.
    async findRole(userId: bigint): Promise<UserRow['role'] | undefined> {
        const user = await userRepository.findById(userId)
        return user?.role
    },
}
