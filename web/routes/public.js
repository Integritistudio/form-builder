import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms, submissions } from "../db/schema.js";
import { validateSubmission } from "../lib/validation.js";
import { getShopSettings } from "../services/shop.js";
import { sendSubmissionEmail } from "../services/email.js";
import { appProxyMiddleware } from "../middleware/verifyAppProxy.js";
import { submitRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.use(appProxyMiddleware);

router.get("/forms/:id", async (req, res) => {
  try {
    const shopDomain = req.shopDomain;
    const [form] = await db
      .select({
        id: forms.id,
        name: forms.name,
        schema: forms.schema,
        styles: forms.styles,
        customCss: forms.customCss,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, req.params.id),
          eq(forms.shopDomain, shopDomain),
          eq(forms.status, "active")
        )
      )
      .limit(1);

    if (!form) {
      return res.status(404).json({ error: "Form not found or not active" });
    }

    res.json({ form });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/forms/:id/submit", submitRateLimiter, async (req, res) => {
  try {
    if (req.body._hp_field) {
      return res.json({ success: true });
    }

    const shopDomain = req.shopDomain;
    const [form] = await db
      .select()
      .from(forms)
      .where(
        and(
          eq(forms.id, req.params.id),
          eq(forms.shopDomain, shopDomain),
          eq(forms.status, "active")
        )
      )
      .limit(1);

    if (!form) {
      return res.status(404).json({ error: "Form not found or not active" });
    }

    const data = req.body.data || req.body;
    const errors = validateSubmission(form.schema, data);

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ errors });
    }

    const [submission] = await db
      .insert(submissions)
      .values({
        formId: form.id,
        shopDomain,
        payload: data,
      })
      .returning();

    res.json({
      success: true,
      message: form.schema?.successMessage || "Thank you for your submission.",
      submissionId: submission.id,
    });

    const settings = await getShopSettings(shopDomain);
    sendSubmissionEmail({
      settings,
      formName: form.name,
      shopName: shopDomain.replace(".myshopify.com", ""),
      schema: form.schema,
      payload: data,
    }).catch((err) => console.error("Email send failed:", err));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
