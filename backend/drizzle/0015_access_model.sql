CREATE TYPE "public"."access_mode" AS ENUM('FREE', 'FREEMIUM', 'PAID', 'VOUCHER');--> statement-breakpoint
CREATE TYPE "public"."access_source" AS ENUM('PAYMENT', 'VOUCHER', 'GRANT');--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'ACCESS_PURCHASE';--> statement-breakpoint
CREATE TABLE "assessment_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"source" "access_source" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_access_user_assessment_unique" UNIQUE("user_id","assessment_id")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "access_mode" "access_mode";--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "access_token_cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment_access" ADD CONSTRAINT "assessment_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_access" ADD CONSTRAINT "assessment_access_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;