import { duration } from 'metautil';
import { shouldUseSecureCookies } from "#config/secure-cookies.js";

export default Object.freeze({
    // enabled: true,
    storage: 'redis',
    // Renaming the cookie invalidates existing browser sessions after deploy.
    cookieName: 'itvibe',
    age: Math.floor( duration('24h')/1000 ), // d - days, h - hours, m - minutes, s - seconds

    /**
     * Configuration for session cookie and the cookie store
     */
    cookie: {
        path: '/',
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        sameSite: 'Lax', // 'Strict' || 'Lax' . 'None' is not secure use only for CSRF protection
    },

});
