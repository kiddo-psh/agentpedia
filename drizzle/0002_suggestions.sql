CREATE TABLE "suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_slug" text NOT NULL,
	"body" text NOT NULL,
	"user_id" text,
	"visitor_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggestions_created_idx" ON "suggestions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "suggestions_visitor_created_idx" ON "suggestions" USING btree ("visitor_hash","created_at");