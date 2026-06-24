export const PLANS = {
  free: { name: "Free", price: 0, formLimit: 3 },
  pro: { name: "Pro", price: 15, formLimit: Infinity },
  premium: { name: "Premium", price: 20, formLimit: Infinity },
};

export function getFormLimit(plan) {
  return PLANS[plan]?.formLimit ?? PLANS.free.formLimit;
}

export function canCreateForm(plan, currentCount) {
  const limit = getFormLimit(plan);
  return currentCount < limit;
}

export function canActivateForm(plan, activeCount, isCurrentlyActive) {
  if (isCurrentlyActive) return true;
  return canCreateForm(plan, activeCount);
}
