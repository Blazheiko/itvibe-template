import { type } from '@arktype/type'

export const PushSubscriptionTestInputSchema = type({
    'title?': 'string <= 200',
    'body?': 'string <= 1000',
    '+': 'reject',
})

export type PushSubscriptionTestInput = typeof PushSubscriptionTestInputSchema.infer
