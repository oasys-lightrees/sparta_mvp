ALTER TABLE "assessments" ADD COLUMN "result_categories" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "category_result" jsonb;--> statement-breakpoint
ALTER TABLE "choices" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;