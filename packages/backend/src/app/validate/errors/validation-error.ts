import type { ValidationIssue } from '#vendor/contracts/validator.js'

/**
 * Request validation failure (422), independent of the validation engine:
 * `messages` are human-readable lines, `issues` (when the validator reports them)
 * map each problem to a field path.
 */
export class ValidationError extends Error {
    public readonly code: string = 'validation_failed'
    public readonly statusCode: number = 422
    public readonly messages: string[]
    public readonly issues: ValidationIssue[] | undefined

    constructor(messages: string[], message?: string, issues?: ValidationIssue[]) {
        super(message ?? 'Validation failure')
        this.name = 'ValidationError'
        this.messages = messages
        this.issues = issues
    }
}
