import { type } from '@arktype/type'

export const UploadAvatarResponseSchema = type({
    status: "'ok' | 'error'",
    'code?': 'string',
    'reason?': 'string',
    'details?': 'unknown',
    'message?': 'string',
    'user?': {
        id: 'string',
        name: 'string',
        email: 'string',
        'avatar?': 'string | null',
    },
})
export type UploadAvatarResponse = typeof UploadAvatarResponseSchema.infer

export const DeleteAvatarResponseSchema = type({
    status: "'ok' | 'error'",
    'code?': 'string',
    'reason?': 'string',
    'details?': 'unknown',
    'message?': 'string',
    'user?': {
        id: 'string',
        name: 'string',
        email: 'string',
        'avatar?': 'string | null',
    },
})
export type DeleteAvatarResponse = typeof DeleteAvatarResponseSchema.infer
