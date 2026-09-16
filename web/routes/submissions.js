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

router.get("/export", async (req, res) => {
  try {
    const shopDomain = getShop(res);
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
      .orderBy(desc(submissions.createdAt));

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No submissions found to export." });
    }

    // Determine all unique field keys / labels across all submissions
    const fieldMap = new Map(); // key -> label
    for (const row of rows) {
      const schemaFields = row.formSchema?.fields || [];
      for (const field of schemaFields) {
        if (field?.id) {
          const label = field.label || field.name || field.id;
          if (!fieldMap.has(field.id)) {
            fieldMap.set(field.id, label);
          }
        }
      }
      if (row.payload && typeof row.payload === "object") {
        for (const k of Object.keys(row.payload)) {
          if (!fieldMap.has(k)) {
            fieldMap.set(k, k);
          }
        }
      }
    }

    const dynamicKeys = Array.from(fieldMap.keys());

    // CSV header row
    const headers = [
      "Submission ID",
      "Form Name",
      "Form ID",
      "Submitted At",
      ...dynamicKeys.map((k) => fieldMap.get(k) || k),
    ];

    function escapeCsv(val) {
      if (val === null || val === undefined) return "";
      let str = typeof val === "object" ? JSON.stringify(val) : String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const csvLines = [];
    csvLines.push(headers.map(escapeCsv).join(","));

    for (const row of rows) {
      const line = [
        row.id,
        row.formName,
        row.formId,
        row.createdAt ? new Date(row.createdAt).toISOString() : "",
      ];

      for (const k of dynamicKeys) {
        const val = row.payload ? row.payload[k] : "";
        line.push(val !== undefined ? val : "");
      }

      csvLines.push(line.map(escapeCsv).join(","));
    }

    const filename = `submissions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
    const csvContent = "\uFEFF" + csvLines.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("Export submissions error:", err);
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

router.get("/files/:fileId/access", async (req, res) => {
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

    const publicUrl = await createPresignedDownloadUrl(file.storageKey, 3600);
    res.json({
      publicUrl,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
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

    const publicUrl = await createPresignedDownloadUrl(file.storageKey, 3600);
    res.json({
      url: publicUrl,
      publicUrl,
      originalName: file.originalName,
      mimeType: file.mimeType,
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

router.delete("/:id", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const [deleted] = await db
      .delete(submissions)
      .where(
        and(
          eq(submissions.id, req.params.id),
          eq(submissions.shopDomain, shopDomain)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete submission error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
