import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const rooms = sqliteTable("rooms", {
  pin: text("pin").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
});
