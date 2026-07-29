/** JSON has no Infinity, so the API sends null for unlimited plan limits. */
export function isUnlimited(value) {
  return value == null || value === Infinity;
}

export function formatLimit(value) {
  return isUnlimited(value) ? "unlimited" : String(value);
}

export function isAtLimit(used, limit) {
  if (isUnlimited(limit)) return false;
  return Number(used ?? 0) >= Number(limit);
}
