CREATE TABLE "likes" (
	"user_id" text NOT NULL,
	"article_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_article_slug_pk" PRIMARY KEY("user_id","article_slug")
);
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "likes_article_idx" ON "likes" USING btree ("article_slug");