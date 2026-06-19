ALTER TABLE "assessments" ADD COLUMN "base_knowledge" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "ai_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "correct_answer" text;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "explanation" text;