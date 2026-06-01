import type { WsContext } from '#vendor/types/types.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { supportService } from '#app/services/support/support-service.js';
import { appErrorToWsError } from '#app/services/shared/ws-error.js';
import { unauthorized } from '#app/services/shared/errors.js';
import type { SupportChatInput, SupportOpenChatInput } from 'shared/schemas';
import type { SupportChatResponse, SupportOpenChatResponse } from 'shared/responses';

export default {
    async openChat(context: WsContext<SupportOpenChatInput>): Promise<SupportOpenChatResponse> {
        const { userData } = context;
        if (userData?.userId === undefined) {
            return appErrorToWsError(unauthorized());
        }

        void supportService.openChat(
            BigInt(userData.userId),
            userData.uuid,
        );

        return { status: 'ok' };
    },

    async chat(context: WsContext<SupportChatInput>): Promise<SupportChatResponse> {
        const { userData } = context;
        if (userData?.userId === undefined) {
            return appErrorToWsError(unauthorized());
        }

        const payload = getTypedPayload(context);

        void supportService.chat(
            BigInt(userData.userId),
            payload.message,
            userData.uuid,
        );

        return { status: 'ok' };
    },
};
