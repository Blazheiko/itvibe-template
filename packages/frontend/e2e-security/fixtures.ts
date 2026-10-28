export const PORT = 3000
export const ORIGIN = `http://localhost:${PORT}`
// Seeded by global-setup.ts (pnpm --filter backend db:seed --demo).
export const USER_1 = { email: 'csrf-e2e-user@example.test', password: 'csrf-e2e-pass-1' }
export const USER_2 = { email: 'csrf-e2e-admin@example.test', password: 'csrf-e2e-pass-2' }
