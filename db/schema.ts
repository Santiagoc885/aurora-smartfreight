import { sqliteTable, integer, real, text } from "drizzle-orm/sqlite-core";
export const dispatches = sqliteTable("dispatches", {
  id: text("id").primaryKey(),
  plate: text("plate").notNull(),
  carrier: text("carrier").notNull(),
  quantities: text("quantities").notNull(),
  weight: integer("weight").notNull(),
  capacity: integer("capacity").notNull(),
  occupancy: real("occupancy").notNull(),
  fare: integer("fare").notNull(),
  deliveries: text("deliveries").notNull(),
  createdAt: text("created_at").notNull(),
});
