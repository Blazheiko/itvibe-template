import { duration } from 'metautil';
import { env } from 'node:process';

import appConfig from '#config/app.js';
import { parseBoolean } from '#vendor/utils/env/parse-boolean.js';

const LEGACY_COOKIE_NAME = 'uapi';
const HOST_PREFIXED_COOKIE_NAME = '__Host-uapi';

const useHostPrefix = parseBoolean(
    env['SESSION_COOKIE_HOST_PREFIX'],
    appConfig.isProductionLike,
);

const cookieName = useHostPrefix
    ? HOST_PREFIXED_COOKIE_NAME
    : LEGACY_COOKIE_NAME;

export default Object.freeze({
    storage: 'redis',
    cookieName,
    legacyCookieName: LEGACY_COOKIE_NAME,
    useHostPrefix,
    age: Math.floor( duration('24h')/1000 ), // d - days, h - hours, m - minutes, s - seconds

    /**
     * Configuration for session cookie and the cookie store
     */
    cookie: {
        path: '/',
        httpOnly: true,
        secure: env['APP_ENV'] !== 'local',
        sameSite: 'Lax', // 'Strict' || 'Lax' . 'None' is not secure use only for CSRF protection
    },

});
