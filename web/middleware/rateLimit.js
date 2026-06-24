import rateLimit from "express-rate-limit";

export const submitRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
  validate: { xForwardedForHeader: false },
});
