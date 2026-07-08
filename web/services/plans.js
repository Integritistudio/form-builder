export const PLANS = {
  free: { name: "Free", price: 0, formLimit: 3 },
  pro: { name: "Pro", price: 15, formLimit: Infinity },
  premium: { name: "Premium", price: 20, formLimit: Infinity },
};

export const PLAN_FEATURES = {
  customCss: ["pro", "premium"],
  gradients: ["pro", "premium"],
  fileUpload: ["pro", "premium"],
  fileUploadPremium: ["premium"],
  multiStep: ["pro", "premium"],
};

export function hasFeature(plan, feature) {
  return PLAN_FEATURES[feature]?.includes(plan) ?? false;
}

export function getPlanFeatures(plan) {
  return {
    customCss: hasFeature(plan, "customCss"),
    gradients: hasFeature(plan, "gradients"),
    fileUpload: hasFeature(plan, "fileUpload"),
    fileUploadPremium: hasFeature(plan, "fileUploadPremium"),
    multiStep: hasFeature(plan, "multiStep"),
  };
}

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
