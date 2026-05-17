CREATE TYPE "public"."email_event_type" AS ENUM('sent', 'delivered', 'open', 'click', 'bounce', 'unsubscribe', 'spam_report');--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"eventType" "email_event_type" NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"metadata" text,
	"sendgridEventId" varchar(255),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_events_sendgridEventId_unique" UNIQUE("sendgridEventId")
);
--> statement-breakpoint
CREATE TABLE "purchase_request_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"totalRecipients" integer DEFAULT 0 NOT NULL,
	"deliveredCount" integer DEFAULT 0 NOT NULL,
	"openedCount" integer DEFAULT 0 NOT NULL,
	"clickedCount" integer DEFAULT 0 NOT NULL,
	"bounceCount" integer DEFAULT 0 NOT NULL,
	"lastEventAt" timestamp with time zone,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_request_summary_requestId_unique" UNIQUE("requestId")
);
--> statement-breakpoint
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_requestId_purchase_requests_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_request_summary" ADD CONSTRAINT "purchase_request_summary_requestId_purchase_requests_id_fk" FOREIGN KEY ("requestId") REFERENCES "public"."purchase_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emailEvents_requestId_idx" ON "email_events" USING btree ("requestId");--> statement-breakpoint
CREATE INDEX "emailEvents_recipientEmail_idx" ON "email_events" USING btree ("recipientEmail");--> statement-breakpoint
CREATE INDEX "emailEvents_eventType_idx" ON "email_events" USING btree ("eventType");--> statement-breakpoint
CREATE INDEX "emailEvents_timestamp_idx" ON "email_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "purchaseRequestSummary_requestId_idx" ON "purchase_request_summary" USING btree ("requestId");