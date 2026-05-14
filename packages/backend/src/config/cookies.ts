import { shouldUseSecureCookies } from "#config/secure-cookies.js";

export default Object.freeze({
    default: {
        path: '/',
        httpOnly: true,
        secure: shouldUseSecureCookies(),
        maxAge: 3600,
        sameSite: 'Lax',
    },
});
