CREATE TABLE "chic_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplyId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"consumptionDate" bigint NOT NULL,
	"recordedBy" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chic_consumptions_supplyId_idx" ON "chic_consumptions" USING btree ("supplyId");--> statement-breakpoint
CREATE INDEX "chic_consumptions_recordedBy_idx" ON "chic_consumptions" USING btree ("recordedBy");