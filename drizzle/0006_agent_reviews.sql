CREATE TABLE "agent_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_slug" text NOT NULL,
	"user_id" text NOT NULL,
	"model" text,
	"task_type" text NOT NULL,
	"stack" text[] DEFAULT '{}' NOT NULL,
	"rating" smallint NOT NULL,
	"would_use_again" boolean NOT NULL,
	"body" text NOT NULL,
	"used_since" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "agent_reviews_rating_ck" CHECK ("agent_reviews"."rating" between 1 and 5),
	CONSTRAINT "agent_reviews_task_type_ck" CHECK ("agent_reviews"."task_type" in ('write_code', 'debug', 'tests', 'docs', 'review', 'design', 'incident', 'refactor'))
);
--> statement-breakpoint
CREATE TABLE "review_helpful" (
	"user_id" text NOT NULL,
	"review_id" uuid NOT NULL,
	CONSTRAINT "review_helpful_user_id_review_id_pk" PRIMARY KEY("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "agent_reviews" ADD CONSTRAINT "agent_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_helpful" ADD CONSTRAINT "review_helpful_review_id_agent_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."agent_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_reviews_user_agent_task_uq" ON "agent_reviews" USING btree ("user_id","agent_slug","task_type");--> statement-breakpoint
CREATE INDEX "agent_reviews_agent_created_idx" ON "agent_reviews" USING btree ("agent_slug","created_at");