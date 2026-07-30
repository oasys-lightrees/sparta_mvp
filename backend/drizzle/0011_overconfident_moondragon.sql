CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "token_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" varchar(255) NOT NULL,
	"token_amount" integer NOT NULL,
	"gross_amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "study_video_url" text;--> statement-breakpoint
ALTER TABLE "token_orders" ADD CONSTRAINT "token_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;