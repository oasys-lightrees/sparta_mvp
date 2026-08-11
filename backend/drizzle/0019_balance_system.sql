ALTER TYPE "public"."transaction_type" RENAME VALUE 'TOKEN_TOPUP' TO 'TOPUP';--> statement-breakpoint
ALTER TABLE "token_orders" RENAME TO "orders";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "token_balance" TO "balance";--> statement-breakpoint
ALTER TABLE "assessments" RENAME COLUMN "access_token_cost" TO "access_cost";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "token_amount" TO "amount";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "token_orders_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "token_orders_order_id_unique";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "premium_token_cost";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "gross_amount";--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_id_unique" UNIQUE("order_id");
