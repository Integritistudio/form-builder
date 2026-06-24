import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { shopSettings } from "../db/schema.js";
import { getShopSettings } from "../services/shop.js";
import { encrypt } from "../lib/encryption.js";
import { sendTestEmail } from "../services/email.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

router.get("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const settings = await getShopSettings(shopDomain);

    res.json({
      settings: {
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpSecure: settings.smtpSecure || false,
        emailTo: settings.emailTo || "",
        emailCc: settings.emailCc || "",
        hasPassword: Boolean(settings.smtpPass),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    await getShopSettings(shopDomain);

    const updates = { updatedAt: new Date() };
    const body = req.body;

    if (body.smtpHost !== undefined) updates.smtpHost = body.smtpHost || null;
    if (body.smtpPort !== undefined)
      updates.smtpPort = body.smtpPort ? parseInt(body.smtpPort, 10) : null;
    if (body.smtpUser !== undefined) updates.smtpUser = body.smtpUser || null;
    if (body.smtpSecure !== undefined) updates.smtpSecure = Boolean(body.smtpSecure);
    if (body.emailTo !== undefined) updates.emailTo = body.emailTo || null;
    if (body.emailCc !== undefined) updates.emailCc = body.emailCc || null;
    if (body.smtpPassword) updates.smtpPass = encrypt(body.smtpPassword);

    const [settings] = await db
      .update(shopSettings)
      .set(updates)
      .where(eq(shopSettings.shopDomain, shopDomain))
      .returning();

    res.json({
      settings: {
        smtpHost: settings.smtpHost || "",
        smtpPort: settings.smtpPort || 587,
        smtpUser: settings.smtpUser || "",
        smtpSecure: settings.smtpSecure || false,
        emailTo: settings.emailTo || "",
        emailCc: settings.emailCc || "",
        hasPassword: Boolean(settings.smtpPass),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/smtp/test", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const settings = await getShopSettings(shopDomain);
    await sendTestEmail(settings);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
