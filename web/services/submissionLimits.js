import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { submissions } from "../db/schema.js";
import {
  formatLimit,
  getMonthlySubmissionLimit,
} from "./plans.js";

/** Start of the current calendar month (UTC). Resets on the 1st at 00:00 UTC. */
export function getCurrentMonthStartUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function countMonthlySubmissions(shopDomain) {
  const monthStart = getCurrentMonthStartUtc();
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.shopDomain, shopDomain),
        gte(submissions.createdAt, monthStart)
      )
    );

  return count ?? 0;
}

export async function getSubmissionUsage(shopDomain, plan) {
  const monthlySubmissions = await countMonthlySubmissions(shopDomain);
  const monthlySubmissionLimit = getMonthlySubmissionLimit(plan);

  return {
    monthlySubmissions,
    monthlySubmissionLimit,
    canSubmit: monthlySubmissions < monthlySubmissionLimit,
  };
}

export function monthlyLimitErrorMessage(plan) {
  const limit = formatLimit(getMonthlySubmissionLimit(plan));
  return `Monthly submission limit reached (${limit} per month). Upgrade your plan or wait until the 1st of next month.`;
}
