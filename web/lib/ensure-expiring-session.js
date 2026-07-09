import { describeSession } from "./session-debug.js";

/**
 * Public apps must use expiring offline tokens. Request them during OAuth and
 * migrate legacy non-expiring tokens when needed.
 */
export async function ensureExpiringOfflineSession(shopify, session) {
  if (session.isOnline || session.refreshToken) {
    return session;
  }

  if (!session.accessToken) {
    console.warn("[auth] Offline session has no access token to migrate.");
    return session;
  }

  console.log(
    "[auth] Migrating non-expiring offline token to expiring token for",
    session.shop
  );

  const { session: migratedSession } =
    await shopify.api.auth.migrateToExpiringToken({
      shop: session.shop,
      nonExpiringOfflineAccessToken: session.accessToken,
    });

  console.log("[auth] Token migration result:", describeSession(migratedSession));
  return migratedSession;
}
