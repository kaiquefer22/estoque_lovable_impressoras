CREATE TABLE "supply_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplyId" integer NOT NULL,
	"fromCompanyId" integer DEFAULT 1 NOT NULL,
	"toCompanyId" integer DEFAULT 2 NOT NULL,
	"quantity" integer NOT NULL,
	"transferDate" bigint NOT NULL,
	"notes" text,
	"transferredBy" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "supplyTransfers_supplyId_idx" ON "supply_transfers" USING btree ("supplyId");--> statement-breakpoint
CREATE INDEX "supplyTransfers_fromCompanyId_idx" ON "supply_transfers" USING btree ("fromCompanyId");--> statement-breakpoint
CREATE INDEX "supplyTransfers_toCompanyId_idx" ON "supply_transfers" USING btree ("toCompanyId");--> statement-breakpoint
CREATE INDEX "supplyTransfers_transferDate_idx" ON "supply_transfers" USING btree ("transferDate");