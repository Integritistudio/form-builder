/**
 * Public apps must use expiring offline tokens. Request them during OAuth and
 * migrate legacy non-expiring tokens when needed.
 */
export async function ensureExpiringOfflineSession(shopify, session) {
  if (session.isOnline || session.refreshToken || !session.accessToken) {
    return session;
  }

  const { session: migratedSession } =
    await shopify.api.auth.migrateToExpiringToken({
      shop: session.shop,
      nonExpiringOfflineAccessToken: session.accessToken,
    });

  return migratedSession;
}
