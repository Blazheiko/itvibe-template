import { type } from '@arktype/type'
import { CanonicalErrorResponseSchema } from './error-response.js'

const AvatarUserSchema = type({
    id: 'string',
    name: 'string',
    email: 'string',
    'avatar?': 'string | null',
})

export const UploadAvatarResponseSchema = type.or(
    {
        status: "'ok'",
        'message?': 'string',
        'user?': AvatarUserSchema,
    },
    CanonicalErrorResponseSchema,
)
export type UploadAvatarResponse = typeof UploadAvatarResponseSchema.infer

export const DeleteAvatarResponseSchema = type.or(
    {
        status: "'ok'",
        'message?': 'string',
        'user?': AvatarUserSchema,
    },
    CanonicalErrorResponseSchema,
)
export type DeleteAvatarResponse = typeof DeleteAvatarResponseSchema.infer
