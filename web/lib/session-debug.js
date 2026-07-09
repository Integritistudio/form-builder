/** @param {import("@shopify/shopify-api").Session | undefined} session */
export function describeSession(session) {
  if (!session) {
    return { present: false };
  }

  return {
    present: true,
    shop: session.shop,
    isOnline: session.isOnline,
    scope: session.scope,
    expires: session.expires?.toISOString?.() ?? session.expires ?? null,
    hasRefreshToken: Boolean(session.refreshToken),
    refreshTokenExpires:
      session.refreshTokenExpires?.toISOString?.() ??
      session.refreshTokenExpires ??
      null,
    accessTokenPrefix: session.accessToken?.slice(0, 8) ?? null,
  };
}
