ALTER TYPE "public"."transaction_type" ADD VALUE 'VOUCHER_PURCHASE';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "voucher_packages" jsonb;