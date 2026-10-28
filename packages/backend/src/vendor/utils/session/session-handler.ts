// import redis from '#database/redis.js';
// import { DateTime } from "luxon";
import crypto from 'node:crypto'

import type {
    HttpContext,
    Session,
    SessionData,
    SessionInfo,
    // WsContext,
} from '#vendor/types/types.js'
import sessionConfig from '#config/session.js'
import {
    saveSession,
    getSession,
    updateSessionData,
    changeSessionData,
    destroySession,
    destroyAllSessions,
    claimCookieRefresh,
    markCookieIssued,
    sessionExists,
} from '#vendor/utils/session/redis-session-storage.js'
import logger from '#vendor/utils/logger.js'
import { RedisUnavailableError } from '#vendor/utils/network/errors/redis-unavailable-error.js'
import { maskTokenForLogs } from '#vendor/utils/helpers/mask-sensitive.js'
import { createSignedToken, verifySignedToken } from '#vendor/utils/session/token-handler.js'
import type { ResponseData } from '#vendor/types/types.js'
import { generateCsrfToken, isValidCsrfToken } from '#vendor/utils/session/csrf-token.js'

const isValidUserToken = (token: unknown): token is string =>
    typeof token === 'string' && /^[a-zA-Z0-9_-]{10,}$/.test(token)

logger.info(`Session storage: ${sessionConfig.storage}`)

const generateSessionId = (): string => crypto.randomUUID()

const withCsrfToken = (data: SessionData): SessionData => ({
    ...data,
    csrfToken: isValidCsrfToken(data.csrfToken) ? data.csrfToken : generateCsrfToken(),
})

/**
 * Sanitizes Redis keys for protection against injections
 * Allowed characters only: letters, digits, hyphen, underscore, colon
 */
// const sanitizeRedisKey = (key: string): string => {
//     if (!/^[a-zA-Z0-9:_*-]+$/.test(key)) {
//         logger.error(`Invalid Redis key format: ${key}`);
//         throw new Error(`Invalid Redis key format`);
//     }
//     return key;
// };

/**
 * How often the cookie of an unchanged session is sent again to slide its expiry.
 * Re-sending it on every request let a slow response restore a session cookie
 * that a concurrent request (password change, logout-all) had already replaced.
 */
const COOKIE_REFRESH_SECONDS = 60 * 60

// Requests that re-send the cookie of the session they arrived with; checked again
// before the response goes out (discardStaleSessionCookie).
const pendingCookieRefresh = new WeakMap<HttpContext, { sessionId: string; userToken: string }>()

const createSessionInfo = async (data: SessionData = {}): Promise<SessionInfo> => {
    const session: SessionInfo = {
        id: generateSessionId(),
        data: withCsrfToken(data),
        createdAt: new Date().toISOString(),
        // expiresAt: DateTime.now().plus({ seconds: sessionConfig.age }).toISO(),
    }

    await saveSession(session)
    // Its cookie goes out with this response: no refresh for the next hour. The
    // session already exists, so a failed marker only means an earlier refresh.
    try {
        await markCookieIssued(session.id, COOKIE_REFRESH_SECONDS)
    } catch (err) {
        logger.warn({ err }, 'Cookie refresh marker not set for a new session')
    }

    return session
}

const ANON_TOKEN = 'anon_session'

const createCookieValue = (sessionId: string, userToken: string | undefined): string =>
    userToken !== undefined ? `${userToken}.${sessionId}` : `${ANON_TOKEN}.${sessionId}`

const updateContextWithNewSession = (
    context: HttpContext,
    newSessionInfo: SessionInfo,
    userToken: string | undefined,
    responseData: ResponseData,
): SessionInfo => {
    const cookieValue = createCookieValue(newSessionInfo.id, userToken)
    const signedToken = createSignedToken(cookieValue)

    responseData.setCookie(sessionConfig.cookieName, signedToken, {
        path: sessionConfig.cookie.path,
        httpOnly: sessionConfig.cookie.httpOnly,
        secure: sessionConfig.cookie.secure,
        maxAge: sessionConfig.age,
        sameSite: sessionConfig.cookie.sameSite,
        expires: new Date(Date.now() + sessionConfig.age * 1000),
    })

    context.session.sessionInfo = newSessionInfo

    return newSessionInfo
}

export const sessionHandler = async (
    context: HttpContext,
    accessToken: string | undefined,
    _userId: string | undefined,
    // The cookie arrived under the legacy name: re-issue it under the current one.
    forceCookie = false,
): Promise<void> => {
    const { responseData } = context

    let sessionId: string | undefined
    let cookieUserToken: string | undefined

    if (accessToken !== undefined) {
        const verifiedData = verifySignedToken(accessToken)

        if (verifiedData !== null) {
            ;({ cookieUserToken, sessionId } = verifiedData)

            if (!isValidUserToken(cookieUserToken)) {
                logger.warn(
                    {
                        ip: context.httpData.ip,
                        userAgent: context.httpData.headers.get('user-agent'),
                    },
                    'Invalid cookieUserToken format in token',
                )
                cookieUserToken = undefined
                sessionId = undefined
            }
        } else {
            logger.warn(
                {
                    ip: context.httpData.ip,
                    userAgent: context.httpData.headers.get('user-agent'),
                },
                'Invalid access token',
            )
        }
    }

    let sessionInfo: SessionInfo | null = null

    if (sessionId !== undefined && cookieUserToken !== undefined) {
        sessionInfo = await getSession(sessionId, cookieUserToken)
    }

    // Anonymous session — no userToken, stored with placeholder key
    sessionInfo ??= await createSessionInfo({})

    const sessionUserToken =
        cookieUserToken ??
        (typeof sessionInfo.data.userToken === 'string' ? sessionInfo.data.userToken : undefined)
    if (!isValidCsrfToken(sessionInfo.data.csrfToken)) {
        const updatedSessionInfo = await updateSessionData(
            sessionInfo.id,
            {
                csrfToken: generateCsrfToken(),
            },
            sessionUserToken ?? ANON_TOKEN,
        )
        if (updatedSessionInfo !== null) {
            sessionInfo = updatedSessionInfo
        }
    }
    const presented = sessionInfo.id === sessionId
    // The refresh claims a separate marker (SET NX EX) and never rewrites the session:
    // a read-then-write here could restore a session another request just deleted.
    if (
        !presented ||
        forceCookie ||
        (await claimCookieRefresh(sessionInfo.id, COOKIE_REFRESH_SECONDS))
    ) {
        if (presented) {
            pendingCookieRefresh.set(context, {
                sessionId: sessionInfo.id,
                userToken: sessionUserToken ?? ANON_TOKEN,
            })
            context.session.beforeSend = async (): Promise<void> => {
                await discardStaleSessionCookie(context)
            }
        }
        const cookieValue = createCookieValue(sessionInfo.id, sessionUserToken)
        responseData.setCookie(sessionConfig.cookieName, createSignedToken(cookieValue), {
            path: sessionConfig.cookie.path,
            httpOnly: sessionConfig.cookie.httpOnly,
            secure: sessionConfig.cookie.secure,
            maxAge: sessionConfig.age,
            sameSite: sessionConfig.cookie.sameSite,
            expires: new Date(Date.now() + sessionConfig.age * 1000),
        })
    }

    // Storage namespace of the current session. Reassigned when login/logout swap the
    // session, so session helpers called later in the same request address the new one.
    let contextUserToken = sessionUserToken ?? ANON_TOKEN

    context.session.sessionInfo = sessionInfo
    context.session.updateSessionData = async (newData: SessionData): Promise<SessionInfo | null> =>
        await updateSessionData(sessionInfo?.id, newData, contextUserToken)
    context.session.changeSessionData = async (newData: SessionData): Promise<SessionInfo | null> =>
        await changeSessionData(sessionInfo?.id, newData, contextUserToken)
    context.session.destroySession = async (): Promise<void> => {
        await destroySession(sessionInfo?.id, contextUserToken)
    }

    context.auth.getUserId = (): string | null => {
        if (sessionInfo === null) return null
        if (sessionInfo.data.userId === undefined) return null
        return typeof sessionInfo.data.userId === 'string' ? sessionInfo.data.userId : null
    }
    context.auth.check = (): boolean => Boolean(sessionInfo?.data.userId)
    context.auth.login = async (
        userId: string | undefined,
        userToken: string | undefined,
    ): Promise<boolean> => {
        if (userId === undefined || userToken === undefined) return false
        try {
            // The previous session goes away whether it was signed in or anonymous:
            // its cookie and CSRF token must not stay usable after the login.
            const oldSessionId = sessionInfo?.id
            if (oldSessionId !== undefined) {
                await destroySession(oldSessionId, contextUserToken)
            }

            const newSessionInfo = await createSessionInfo({
                userId,
                userToken,
            })

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                userToken,
                responseData,
            )
            contextUserToken = userToken

            logger.info({ userId, sessionId: newSessionInfo.id }, `User logged in`)

            return true
        } catch (err) {
            logger.error({ err }, 'Login error:')
            throw err
        }
    }

    context.auth.logout = async (): Promise<boolean> => {
        try {
            const currentUserToken =
                typeof sessionInfo?.data.userToken === 'string'
                    ? sessionInfo.data.userToken
                    : undefined
            const currentSessionId = sessionInfo?.id
            if (currentUserToken !== undefined && currentSessionId !== undefined) {
                await destroySession(currentSessionId, currentUserToken)
                logger.info(
                    {
                        userId: sessionInfo?.data.userId,
                        sessionId: currentSessionId,
                    },
                    `User logged out`,
                )
            }

            const newSessionInfo = await createSessionInfo({})

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                undefined,
                responseData,
            )
            contextUserToken = ANON_TOKEN

            return true
        } catch (err) {
            logger.error({ err }, 'Logout error')
            throw err
        }
    }

    context.auth.logoutAll = async (): Promise<number> => {
        try {
            const currentUserToken =
                typeof sessionInfo?.data.userToken === 'string'
                    ? sessionInfo.data.userToken
                    : undefined
            if (currentUserToken === undefined) return 0

            // The current session survives a stopped run, so the client can repeat
            // logoutAll while still authenticated; it is deleted last.
            const deletedCount = await destroyAllSessions(currentUserToken, sessionInfo?.id)
            logger.info(
                {
                    userId: sessionInfo?.data.userId,
                    deletedCount,
                },
                `User logged out all sessions`,
            )

            const newSessionInfo = await createSessionInfo({})

            sessionInfo = updateContextWithNewSession(
                context,
                newSessionInfo,
                undefined,
                responseData,
            )
            contextUserToken = ANON_TOKEN

            return deletedCount
        } catch (err) {
            logger.error({ err }, 'LogoutAll error')
            throw err
        }
    }
}

export type WsSessionResult =
    { kind: 'ok'; session: Session } | { kind: 'missing' } | { kind: 'unavailable' }

const MISSING: WsSessionResult = { kind: 'missing' }

export const wsSessionHandler = async (
    sessionId: string,
    userToken: string,
): Promise<WsSessionResult> => {
    try {
        if (!isValidUserToken(userToken)) {
            logger.warn({ sessionId }, 'wsSessionHandler: invalid userToken format')
            return MISSING
        }

        const sessionInfo = await getSession(sessionId, userToken)

        if (sessionInfo === null) {
            logger.warn({ sessionId, userToken: maskTokenForLogs(userToken) }, 'Session not found')
            return MISSING
        }

        if (typeof sessionInfo.data.userId !== 'string' || sessionInfo.data.userId === '') {
            logger.warn(
                { sessionId, userToken: maskTokenForLogs(userToken) },
                'wsSessionHandler: session has no userId — not authenticated',
            )
            return MISSING
        }

        const session: Session = {
            sessionInfo,
            updateSessionData: async (newData: SessionData) =>
                await updateSessionData(sessionInfo.id, newData, userToken),
            changeSessionData: async (newData: SessionData) =>
                await changeSessionData(sessionInfo.id, newData, userToken),
            destroySession: async (): Promise<void> => {
                await destroySession(sessionInfo.id, userToken)
            },
            destroyAllSessions: async (): Promise<number> => {
                return await destroyAllSessions(userToken)
            },
        }
        return { kind: 'ok', session }
    } catch (err) {
        // Not an expired session: the caller keeps the connection open.
        if (err instanceof RedisUnavailableError) return { kind: 'unavailable' }
        logger.error(
            { err, sessionId, userToken: maskTokenForLogs(userToken) },
            'wsSessionHandler error',
        )
        return MISSING
    }
}

// export default { sessionHandler, wsSessionHandler };

/**
 * Before the response goes out: a request that re-sends the cookie of the session
 * it arrived with must not restore that cookie if the session was deleted meanwhile
 * (a password change or logout-all in another request replaced it). Requests that
 * swapped the session themselves (login, logout) keep their cookie.
 */
export const discardStaleSessionCookie = async (context: HttpContext): Promise<void> => {
    const pending = pendingCookieRefresh.get(context)
    if (pending === undefined) return
    pendingCookieRefresh.delete(context)
    if (context.session.sessionInfo?.id !== pending.sessionId) return
    try {
        if (!(await sessionExists(pending.sessionId, pending.userToken))) {
            context.responseData.cookies.delete(sessionConfig.cookieName)
        }
    } catch (err) {
        // The handler's result stands; only the unconfirmed cookie is held back.
        logger.warn({ err }, 'Session cookie refresh skipped: session check failed')
        context.responseData.cookies.delete(sessionConfig.cookieName)
    }
}
