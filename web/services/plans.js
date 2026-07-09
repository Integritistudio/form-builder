export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    totalFormLimit: 5,
    activeFormLimit: 1,
    monthlySubmissionLimit: 500,
  },
  pro: {
    name: "Pro",
    price: 9.99,
    totalFormLimit: 10,
    activeFormLimit: 5,
    monthlySubmissionLimit: Infinity,
  },
  premium: {
    name: "Premium",
    price: 14.99,
    totalFormLimit: Infinity,
    activeFormLimit: Infinity,
    monthlySubmissionLimit: Infinity,
  },
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

export function getPlanName(plan) {
  return PLANS[plan]?.name ?? PLANS.free.name;
}

export function getTotalFormLimit(plan) {
  return PLANS[plan]?.totalFormLimit ?? PLANS.free.totalFormLimit;
}

export function getActiveFormLimit(plan) {
  return PLANS[plan]?.activeFormLimit ?? PLANS.free.activeFormLimit;
}

export function getMonthlySubmissionLimit(plan) {
  return PLANS[plan]?.monthlySubmissionLimit ?? PLANS.free.monthlySubmissionLimit;
}

export function formatLimit(limit) {
  return limit === Infinity ? "unlimited" : String(limit);
}

export function canCreateForm(plan, currentCount) {
  const limit = getTotalFormLimit(plan);
  return currentCount < limit;
}

export function canActivateForm(plan, activeCount, isCurrentlyActive) {
  if (isCurrentlyActive) return true;
  const limit = getActiveFormLimit(plan);
  return activeCount < limit;
}
