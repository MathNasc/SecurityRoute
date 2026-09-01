import { pgTable, serial, text, doublePrecision, timestamp, varchar } from 'drizzle-orm/pg-core';

export const occurrences = pgTable('occurrences', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 50 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
