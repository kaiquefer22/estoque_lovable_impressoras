ALTER TABLE "supply_transfers" ALTER COLUMN "createdAt" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "supply_transfers" ALTER COLUMN "createdAt" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "supply_transfers" ALTER COLUMN "updatedAt" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "supply_transfers" ALTER COLUMN "updatedAt" DROP DEFAULT;