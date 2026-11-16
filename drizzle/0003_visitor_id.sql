ALTER TABLE "events" ADD COLUMN "visitor_id" uuid;--> statement-breakpoint
CREATE INDEX "events_visitor_created_idx" ON "events" USING btree ("visitor_id","created_at");