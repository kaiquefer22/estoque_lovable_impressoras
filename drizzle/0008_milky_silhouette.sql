CREATE TABLE "dispatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplyId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"dispatchDate" bigint NOT NULL,
	"dispatchedBy" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"receivedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dispatches_supplyId_idx" ON "dispatches" USING btree ("supplyId");--> statement-breakpoint
CREATE INDEX "dispatches_status_idx" ON "dispatches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dispatches_dispatchedBy_idx" ON "dispatches" USING btree ("dispatchedBy");