import { expect, it } from 'vitest'

// Temporary negative control for feat-018 (F01.6): must make CI red.
it('negative control', () => {
    expect(1).toBe(2)
})

export async function negativeControlLint(): Promise<void> {
    void Promise.resolve()
    await Promise.resolve()
}
