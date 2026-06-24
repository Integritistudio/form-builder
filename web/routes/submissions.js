import { Router } from "express";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms, submissions, submissionFiles } from "../db/schema.js";
import { createPresignedDownloadUrl, getFileBuffer } from "../services/storage.js";
import { attachFilesToSubmissions } from "../lib/submissionFiles.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

router.get("/analytics", async (req, res) => {
  try {
    const shopDomain = getShop(res);

    const [{ total }] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(submissions)
      .where(eq(submissions.shopDomain, shopDomain));

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [{ weekCount }] = await db
      .select({ weekCount: sql`COUNT(*)::int` })
      .from(submissions)
      .where(
        and(
          eq(submissions.shopDomain, shopDomain),
          gte(submissions.createdAt, weekAgo)
        )
      );

    const [{ activeForms }] = await db
      .select({ activeForms: sql`COUNT(*)::int` })
      .from(forms)
      .where(
        and(eq(forms.shopDomain, shopDomain), eq(forms.status, "active"))
      );

    const topForms = await db
      .select({
        formId: forms.id,
        formName: forms.name,
        count: sql`COUNT(${submissions.id})::int`,
      })
      .from(forms)
      .leftJoin(submissions, eq(submissions.formId, forms.id))
      .where(eq(forms.shopDomain, shopDomain))
      .groupBy(forms.id, forms.name)
      .orderBy(desc(sql`COUNT(${submissions.id})`))
      .limit(1);

    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [{ count }] = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(submissions)
        .where(
          and(
            eq(submissions.shopDomain, shopDomain),
            gte(submissions.createdAt, dayStart),
            lt(submissions.createdAt, dayEnd)
          )
        );

      dailyCounts.push({
        date: dayStart.toISOString().slice(0, 10),
        count,
      });
    }

    res.json({
      totalSubmissions: total,
      weekSubmissions: weekCount,
      activeForms,
      topForm: topForms[0] || null,
      dailyCounts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, parseInt(req.query.limit || "20", 10));
    const offset = (page - 1) * limit;
    const formId = req.query.formId;
    const days = parseInt(req.query.days || "0", 10);

    const conditions = [eq(submissions.shopDomain, shopDomain)];
    if (formId) conditions.push(eq(submissions.formId, formId));
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      conditions.push(gte(submissions.createdAt, since));
    }

    const whereClause = and(...conditions);

    const rows = await db
      .select({
        id: submissions.id,
        formId: submissions.formId,
        formName: forms.name,
        formSchema: forms.schema,
        payload: submissions.payload,
        createdAt: submissions.createdAt,
      })
      .from(submissions)
      .innerJoin(forms, eq(forms.id, submissions.formId))
      .where(whereClause)
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(submissions)
      .where(whereClause);

    const formList = await db
      .select({ id: forms.id, name: forms.name })
      .from(forms)
      .where(eq(forms.shopDomain, shopDomain))
      .orderBy(forms.name);

    const enriched = await attachFilesToSubmissions(
      rows.map((row) => ({ ...row, formSchema: row.formSchema })),
      shopDomain
    );

    res.json({
      submissions: enriched,
      forms: formList,
      pagination: { page, limit, total: count },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/files/:fileId/download", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [file] = await db
      .select()
      .from(submissionFiles)
      .where(
        and(
          eq(submissionFiles.id, req.params.fileId),
          eq(submissionFiles.shopDomain, shopDomain)
        )
      )
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const url = await createPresignedDownloadUrl(file.storageKey, 3600);
    res.json({
      url,
      originalName: file.originalName,
      mimeType: file.mimeType,
      viewUrl: `/api/submissions/files/${file.id}/view`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/files/:fileId/view", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [file] = await db
      .select()
      .from(submissionFiles)
      .where(
        and(
          eq(submissionFiles.id, req.params.fileId),
          eq(submissionFiles.shopDomain, shopDomain)
        )
      )
      .limit(1);

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const buffer = await getFileBuffer(file.storageKey);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.originalName)}"`
    );
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:submissionId/files", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const files = await db
      .select()
      .from(submissionFiles)
      .where(
        and(
          eq(submissionFiles.submissionId, req.params.submissionId),
          eq(submissionFiles.shopDomain, shopDomain)
        )
      );

    res.json({
      files: files.map((file) => ({
        ...file,
        viewUrl: `/api/submissions/files/${file.id}/view`,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
