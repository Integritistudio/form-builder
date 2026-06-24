import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// Map .env names used by this project to Shopify CLI variable names
if (!process.env.SHOPIFY_API_KEY && process.env.CLIENT_ID) {
  process.env.SHOPIFY_API_KEY = process.env.CLIENT_ID;
}
if (!process.env.SHOPIFY_API_SECRET && process.env.CLIENT_SECRET) {
  process.env.SHOPIFY_API_SECRET = process.env.CLIENT_SECRET;
}

export function dbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USERNAME || "postgres",
    password: String(process.env.DB_PASSWORD ?? ""),
    database: process.env.DB_NAME || "shopify-app",
  };
}
