import aiConfig from '#config/ai.js'
import appConfig from '#config/app.js'
import { authConfig } from '#config/auth.js'
import cspConfig from '#config/csp.js'
import { networkConfig } from '#config/network.js'
import rateLimitConfig from '#config/rate-limit.js'
import redisConfig from '#config/redis.js'
import { throttlePolicyConfigError } from '#config/throttle-policies.js'
import sessionConfig from '#config/session.js'
import logger from '#logger'

/** Per-IP limits are only as good as the client IP: warn when it is the proxy's. */
export function getProxyWarning(): string | null {
    if (!appConfig.isProductionLike) return null
    if (!networkConfig.trustProxy) {
        return 'TRUST_PROXY=false: behind a reverse proxy every client shares the proxy IP and one rate-limit budget'
    }
    if (networkConfig.trustedProxyCidrs.length === 0) {
        return 'TRUST_PROXY=true but TRUSTED_PROXY_CIDRS is empty: no proxy is trusted, so behind a proxy every client shares one rate-limit budget'
    }
    return null
}

export function validateRuntimeConfig(): void {
    if (cspConfig.configError !== null) {
        throw new Error(`Invalid CSP configuration: ${cspConfig.configError}`)
    }

    if (rateLimitConfig.configError !== null) {
        throw new Error(`Invalid rate limit configuration: ${rateLimitConfig.configError}`)
    }

    if (redisConfig.configError !== null) {
        throw new Error(`Invalid Redis configuration: ${redisConfig.configError}`)
    }

    if (aiConfig.configError !== null) {
        throw new Error(`Invalid AI configuration: ${aiConfig.configError}`)
    }

    if (throttlePolicyConfigError !== null) {
        throw new Error(`Invalid throttle policy configuration: ${throttlePolicyConfigError}`)
    }

    const proxyWarning = getProxyWarning()
    if (proxyWarning !== null) {
        logger.warn(proxyWarning)
    }

    if (sessionConfig.useHostPrefix) {
        if (!sessionConfig.cookie.secure) {
            throw new Error(
                'SESSION_COOKIE_HOST_PREFIX=true requires the session cookie to be served with Secure=true',
            )
        }
        if (!appConfig.url.startsWith('https://')) {
            throw new Error('SESSION_COOKIE_HOST_PREFIX=true requires APP_URL to use https://')
        }
    }

    if (authConfig.phoneAuthEnabled) {
        const otpHashSecret = authConfig.otpHmacKey?.trim() || appConfig.key?.trim() || ''

        if (otpHashSecret === '') {
            throw new Error(
                'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY for OTP hashing',
            )
        }

        if (otpHashSecret.length < 32) {
            throw new Error(
                'Phone authentication requires AUTH_OTP_HMAC_KEY or APP_KEY to be at least 32 characters long',
            )
        }
    }

    if (authConfig.smsProvider !== 'fake') {
        return
    }

    if (!authConfig.allowFakeSmsProvider) {
        throw new Error('AUTH_SMS_PROVIDER=fake requires AUTH_SMS_PROVIDER_ALLOW_FAKE=true')
    }

    if (appConfig.isProductionLike) {
        throw new Error('AUTH_SMS_PROVIDER=fake is forbidden in production-like environments')
    }

    if (!authConfig.fakeSmsCodeExplicitlySet) {
        throw new Error(
            'AUTH_FAKE_SMS_CODE must be explicitly set when AUTH_SMS_PROVIDER=fake is enabled',
        )
    }
}
