import { hashPassword, validatePassword } from 'metautil'
import { describe, expect, it } from 'vitest'

import supportConfig from '../../config/support.js'
import { llmPromptTypeEnum } from '../../database/schema.js'
import { SEED_PROMPTS } from './prompts.js'
import { runSeed } from './run-seed.js'
import type { ExistingUser, SeedStore, SeedUser } from './run-seed.js'

type FakeStore = SeedStore & {
    prompts: Set<string>
    users: Map<string, ExistingUser>
    insertedUsers: SeedUser[]
}

function createFakeStore(existingUsers: Record<string, ExistingUser> = {}): FakeStore {
    const prompts = new Set<string>()
    const users = new Map(Object.entries(existingUsers))
    const insertedUsers: SeedUser[] = []
    return {
        prompts,
        users,
        insertedUsers,
        insertPromptIfMissing(prompt) {
            if (prompts.has(prompt.type)) return Promise.resolve(false)
            prompts.add(prompt.type)
            return Promise.resolve(true)
        },
        findUserByEmail(email) {
            return Promise.resolve(users.get(email))
        },
        insertUser(user) {
            insertedUsers.push(user)
            users.set(user.email, { id: BigInt(users.size + 1), role: user.role })
            return Promise.resolve()
        },
    }
}

const fakeHash = (password: string): Promise<string> => Promise.resolve(`hashed:${password}`)

const demoEnv = {
    SEED_ADMIN_EMAIL: '  Admin@Example.test ',
    SEED_ADMIN_PASSWORD: 'admin-password',
    SEED_USER_EMAIL: 'user@example.test',
    SEED_USER_PASSWORD: 'user-password',
}

describe('SEED_PROMPTS', () => {
    it('covers every llm_prompt_type exactly once', () => {
        expect(SEED_PROMPTS.map((p) => p.type).sort()).toEqual(
            [...llmPromptTypeEnum.enumValues].sort(),
        )
    })

    it('uses the runtime fallback texts and generation settings', () => {
        const byType = Object.fromEntries(SEED_PROMPTS.map((p) => [p.type, p]))
        expect(byType['SUPPORT_SYSTEM']?.content).toBe(supportConfig.defaultSystemPrompt)
        expect(byType['SUPPORT_SYSTEM']?.content).toContain('{context}')
        expect(byType['SUPPORT_FIRST_CHAT']?.content).toBe(supportConfig.defaultFirstChatPrompt)
        expect(byType['SUPPORT_QUERY_TRANSLATION']?.content).toBe(
            supportConfig.defaultTranslationPrompt,
        )
        for (const prompt of SEED_PROMPTS) {
            expect(prompt.temperature).toBe(
                supportConfig.defaultGeneration[prompt.type].temperature,
            )
            expect(prompt.maxTokens).toBe(supportConfig.defaultGeneration[prompt.type].maxTokens)
            expect(prompt.model).toBeNull()
        }
    })
})

describe('runSeed', () => {
    it('inserts prompts and skips demo accounts without --demo, whatever APP_ENV says', async () => {
        const store = createFakeStore()
        const report = await runSeed(store, {
            demo: false,
            env: { ...demoEnv, APP_ENV: 'local' },
            hashPassword: fakeHash,
        })

        expect(Object.values(report.prompts)).toEqual(
            SEED_PROMPTS.map(() => ({ status: 'inserted' })),
        )
        expect(report.admin).toEqual({
            status: 'skipped',
            reason: 'demo_disabled',
        })
        expect(report.user).toEqual({ status: 'skipped', reason: 'demo_disabled' })
        expect(store.insertedUsers).toEqual([])
    })

    it('is idempotent: a second run only skips', async () => {
        const store = createFakeStore()
        const options = { demo: true, env: demoEnv, hashPassword: fakeHash }
        await runSeed(store, options)
        const second = await runSeed(store, options)

        expect(Object.values(second.prompts)).toEqual(
            SEED_PROMPTS.map(() => ({ status: 'skipped', reason: 'already_exists' })),
        )
        expect(second.admin).toEqual({
            status: 'skipped',
            reason: 'already_exists',
        })
        expect(second.user).toEqual({
            status: 'skipped',
            reason: 'already_exists',
        })
        expect(store.insertedUsers).toHaveLength(2)
    })

    it('creates the admin and the user with normalized emails and hashed passwords', async () => {
        const store = createFakeStore()
        const report = await runSeed(store, {
            demo: true,
            env: demoEnv,
            hashPassword: fakeHash,
        })

        expect(report.admin).toEqual({ status: 'inserted' })
        expect(report.user).toEqual({ status: 'inserted' })
        expect(store.insertedUsers).toEqual([
            {
                name: 'Admin',
                email: 'admin@example.test',
                passwordHash: 'hashed:admin-password',
                role: 'admin',
            },
            {
                name: 'Demo User',
                email: 'user@example.test',
                passwordHash: 'hashed:user-password',
                role: 'user',
            },
        ])
    })

    it('stores a hash that validatePassword accepts, never the plain password', async () => {
        const store = createFakeStore()
        await runSeed(store, { demo: true, env: demoEnv, hashPassword })

        const admin = store.insertedUsers[0]
        expect(admin?.passwordHash).not.toBe('admin-password')
        expect(admin?.passwordHash.startsWith('$scrypt$')).toBe(true)
        expect(await validatePassword('admin-password', admin?.passwordHash ?? '')).toBe(true)
    })

    it('reports missing_credentials when SEED_* variables are absent or blank', async () => {
        const store = createFakeStore()
        const report = await runSeed(store, {
            demo: true,
            env: {
                SEED_ADMIN_EMAIL: 'admin@example.test',
                SEED_ADMIN_PASSWORD: '  ',
            },
            hashPassword: fakeHash,
        })

        expect(report.admin).toEqual({
            status: 'skipped',
            reason: 'missing_credentials',
        })
        expect(report.user).toEqual({
            status: 'skipped',
            reason: 'missing_credentials',
        })
        expect(store.insertedUsers).toEqual([])
    })

    it('does not promote an existing non-admin user to admin', async () => {
        const store = createFakeStore({
            'admin@example.test': { id: 7n, role: 'user' },
        })
        const report = await runSeed(store, {
            demo: true,
            env: demoEnv,
            hashPassword: fakeHash,
        })

        expect(report.admin).toEqual({
            status: 'skipped',
            reason: 'exists_without_admin_role',
        })
        expect(store.users.get('admin@example.test')).toEqual({
            id: 7n,
            role: 'user',
        })
        expect(store.insertedUsers.map((u) => u.role)).toEqual(['user'])
    })

    it("propagates store errors so the caller's transaction rolls back", async () => {
        const store = createFakeStore()
        store.insertUser = () => Promise.reject(new Error('insert failed'))

        await expect(
            runSeed(store, { demo: true, env: demoEnv, hashPassword: fakeHash }),
        ).rejects.toThrow('insert failed')
    })
})
