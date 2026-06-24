import { Router } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms, submissions } from "../db/schema.js";
import { DEFAULT_FORM_SCHEMA, DEFAULT_STYLES } from "../lib/formDefaults.js";
import { getShopSettings } from "../services/shop.js";
import {
  canCreateForm,
  canActivateForm,
  getFormLimit,
} from "../services/plans.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

router.get("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const rows = await db
      .select({
        id: forms.id,
        name: forms.name,
        status: forms.status,
        createdAt: forms.createdAt,
        updatedAt: forms.updatedAt,
        submissionCount: count(submissions.id),
      })
      .from(forms)
      .leftJoin(submissions, eq(submissions.formId, forms.id))
      .where(eq(forms.shopDomain, shopDomain))
      .groupBy(forms.id)
      .orderBy(desc(forms.createdAt));

    res.json({ forms: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const settings = await getShopSettings(shopDomain);

    const [{ count }] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(forms)
      .where(eq(forms.shopDomain, shopDomain));

    if (!canCreateForm(settings.plan, count)) {
      return res.status(403).json({
        error: `Free plan allows up to ${getFormLimit("free")} forms. Upgrade to create more.`,
        code: "PLAN_LIMIT",
      });
    }

    const name = req.body.name?.trim() || "Untitled form";
    const [form] = await db
      .insert(forms)
      .values({
        shopDomain,
        name,
        status: "draft",
        schema: req.body.schema || DEFAULT_FORM_SCHEMA,
        styles: req.body.styles || DEFAULT_STYLES,
        customCss: req.body.customCss || "",
      })
      .returning();

    res.status(201).json({ form });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [form] = await db
      .select()
      .from(forms)
      .where(
        and(eq(forms.id, req.params.id), eq(forms.shopDomain, shopDomain))
      )
      .limit(1);

    if (!form) return res.status(404).json({ error: "Form not found" });
    res.json({ form });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [existing] = await db
      .select()
      .from(forms)
      .where(
        and(eq(forms.id, req.params.id), eq(forms.shopDomain, shopDomain))
      )
      .limit(1);

    if (!existing) return res.status(404).json({ error: "Form not found" });

    const settings = await getShopSettings(shopDomain);
    const newStatus = req.body.status ?? existing.status;

    if (newStatus === "active" && existing.status !== "active") {
      const [{ count }] = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(forms)
        .where(
          and(eq(forms.shopDomain, shopDomain), eq(forms.status, "active"))
        );

      if (!canActivateForm(settings.plan, count, false)) {
        return res.status(403).json({
          error: `Free plan allows up to ${getFormLimit("free")} active forms. Upgrade to activate more.`,
          code: "PLAN_LIMIT",
        });
      }
    }

    const updates = { updatedAt: new Date() };
    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.schema !== undefined) updates.schema = req.body.schema;
    if (req.body.styles !== undefined) updates.styles = req.body.styles;
    if (req.body.customCss !== undefined) updates.customCss = req.body.customCss;

    const [form] = await db
      .update(forms)
      .set(updates)
      .where(eq(forms.id, req.params.id))
      .returning();

    res.json({ form });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [deleted] = await db
      .delete(forms)
      .where(
        and(eq(forms.id, req.params.id), eq(forms.shopDomain, shopDomain))
      )
      .returning();

    if (!deleted) return res.status(404).json({ error: "Form not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/submissions", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [form] = await db
      .select()
      .from(forms)
      .where(
        and(eq(forms.id, req.params.id), eq(forms.shopDomain, shopDomain))
      )
      .limit(1);

    if (!form) return res.status(404).json({ error: "Form not found" });

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const offset = (page - 1) * limit;

    const rows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.formId, req.params.id))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(submissions)
      .where(eq(submissions.formId, req.params.id));

    res.json({
      submissions: rows,
      pagination: { page, limit, total: count },
      form: { id: form.id, name: form.name, schema: form.schema },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
