CREATE TABLE "survey_comment_reports" (
	"comment_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_comment_reports_comment_id_visitor_id_pk" PRIMARY KEY("comment_id","visitor_id")
);
--> statement-breakpoint
CREATE TABLE "survey_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_slug" text NOT NULL,
	"visitor_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"body" text NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"user_id" text,
	"agents" text[] NOT NULL,
	"agent_other" text,
	"model" text NOT NULL,
	"model_other" text,
	"uses" text[] NOT NULL,
	"use_other" text,
	"tenure" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "survey_comment_reports" ADD CONSTRAINT "survey_comment_reports_comment_id_survey_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."survey_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_comments_post_created_idx" ON "survey_comments" USING btree ("post_slug","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_responses_visitor_idx" ON "survey_responses" USING btree ("visitor_id");