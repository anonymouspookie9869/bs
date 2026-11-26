import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  contactNumber: text('contact_number').notNull(),
  projectType: text('project_type').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const videos = pgTable('videos', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  genre: text('genre').notNull(),
  role: text('role').notNull(),
  duration: text('duration').notNull().default('01:00'),
  year: text('year').notNull().default('2026'),
  summary: text('summary').notNull(),
  videoUrl: text('video_url').notNull(),
  posterUrl: text('poster_url'),
  mimeType: text('mime_type').notNull().default('video/mp4'),
  artworkTheme: text('artwork_theme').notNull().default('events'),
  featured: boolean('featured').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type InquiryRow = typeof inquiries.$inferSelect;
export type VideoRow = typeof videos.$inferSelect;
