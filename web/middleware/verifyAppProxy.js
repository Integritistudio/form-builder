import crypto from "crypto";

export function verifyAppProxy(query, secret) {
  const { signature, ...params } = query;
  if (!signature) return false;

  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${Array.isArray(params[key]) ? params[key].join(",") : params[key]}`)
    .join("");

  const hash = crypto
    .createHmac("sha256", secret)
    .update(sorted)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export function appProxyMiddleware(req, res, next) {
  const secret = process.env.CLIENT_SECRET || process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    return res.status(500).json({ error: "App not configured" });
  }

  if (!verifyAppProxy(req.query, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  req.shopDomain = req.query.shop;
  next();
}
