export const PENDING_SMS_CODE_HASH_PLACEHOLDER = '__pending_sms_verification_code__';

// Use one shared per-phone throttle bucket across register/reset/link flows
// so a single number cannot bypass limits by hopping between flows.
export const PHONE_SMS_SEND_THROTTLE_SCOPE = 'sms_send_phone';
