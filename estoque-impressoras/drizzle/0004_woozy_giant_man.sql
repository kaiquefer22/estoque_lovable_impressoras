ALTER TABLE "order_inspections" ADD COLUMN "hasEntryApproval" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_inspections" ADD COLUMN "entryApprovedAt" bigint;--> statement-breakpoint
ALTER TABLE "order_inspections" ADD COLUMN "entryApprovedBy" integer;