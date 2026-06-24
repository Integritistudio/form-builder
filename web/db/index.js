import "../env.js";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { dbConfig } from "../env.js";
import * as schema from "./schema.js";

const config = dbConfig();

const pool = new pg.Pool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
});

export const db = drizzle(pool, { schema });
export { pool };
