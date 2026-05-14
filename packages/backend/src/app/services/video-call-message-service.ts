import { Result } from "better-result";
import type { UserConnection } from "#vendor/types/types.js";
import { badRequest, type AppResult } from "#app/services/shared/errors.js";

export const videoCallMessageService = {
    async startVideoCallLog(
        _sessionUserId: string | undefined,
        _targetUserId: string,
        _userData?: UserConnection,
    ): Promise<AppResult<{ message: never }>> {
        return Result.err(badRequest('Video calls are not available'));
    },

    async finishVideoCallLog(
        _sessionUserId: string | undefined,
        _targetUserId: string,
        _videoCallIdValue: string,
        _userData?: UserConnection,
    ): Promise<AppResult<{ message: never }>> {
        return Result.err(badRequest('Video calls are not available'));
    },

    async finishVideoCallLogOnDisconnect(_params: {
        callerUserId: string | undefined;
        targetUserId: string | undefined;
        videoCallId: string | undefined;
    }): Promise<void> {},
};
