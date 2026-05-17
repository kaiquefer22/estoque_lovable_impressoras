CREATE TYPE "public"."inspection_item_status" AS ENUM('ok', 'parcial', 'faltante', 'danificado');--> statement-breakpoint
CREATE TYPE "public"."inspection_report_status" AS ENUM('gerado', 'enviado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('entrada', 'saida');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('solicitacao', 'conferencia', 'ambos');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pendente', 'em_transito', 'entregue', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."purchase_request_status" AS ENUM('rascunho', 'enviado', 'confirmado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."supply_type" AS ENUM('cartucho', 'papel', 'tanque_manutencao');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"userName" varchar(200) NOT NULL,
	"action" varchar(50) NOT NULL,
	"module" varchar(100) NOT NULL,
	"entityId" integer,
	"entityName" varchar(300),
	"details" text,
	"timestamp" bigint NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"verifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "inspection_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspectionId" integer NOT NULL,
	"orderItemId" integer NOT NULL,
	"quantityReceived" integer NOT NULL,
	"quantityExpected" integer NOT NULL,
	"status" "inspection_item_status" DEFAULT 'ok' NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspectionId" integer NOT NULL,
	"reportDate" bigint NOT NULL,
	"sentDate" bigint,
	"recipientEmails" text,
	"csvData" text,
	"status" "inspection_report_status" DEFAULT 'gerado' NOT NULL,
	"userId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"ipAddress" varchar(45) NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"type" "notification_type" DEFAULT 'ambos' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"userId" integer NOT NULL,
	"confirmedAt" bigint NOT NULL,
	"withEntry" boolean DEFAULT false NOT NULL,
	"itemIds" text,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"inspectionDate" bigint NOT NULL,
	"status" "inspection_status" DEFAULT 'em_andamento' NOT NULL,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permission_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"moduleId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"displayName" varchar(200) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"displayName" varchar(200) NOT NULL,
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_modules_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "permission_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permission_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "printers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"model" varchar(200) NOT NULL,
	"brand" varchar(100) DEFAULT 'Epson' NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"supplyId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" varchar(20),
	"expectedReturnDate" bigint,
	"notes" text,
	"received" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderNumber" varchar(100),
	"supplier" varchar(300) NOT NULL,
	"status" "order_status" DEFAULT 'pendente' NOT NULL,
	"orderDate" bigint NOT NULL,
	"estimatedDelivery" bigint,
	"actualDelivery" bigint,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"requestDate" bigint NOT NULL,
	"sentDate" bigint,
	"status" "purchase_request_status" DEFAULT 'rascunho' NOT NULL,
	"recipientEmails" text,
	"csvData" text,
	"notes" text,
	"userId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"roleId" integer NOT NULL,
	"moduleId" integer NOT NULL,
	"actionId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"displayName" varchar(200) NOT NULL,
	"description" text,
	"isSystem" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"frequency" varchar(50) NOT NULL,
	"dayOfWeek" integer,
	"dayOfMonth" integer,
	"time" varchar(5),
	"recipientEmails" text,
	"includeGraphs" boolean DEFAULT true NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSentAt" timestamp with time zone,
	"nextSendAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplyId" integer NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previousStock" integer DEFAULT 0 NOT NULL,
	"newStock" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"userId" integer,
	"movementDate" bigint NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplies" (
	"id" serial PRIMARY KEY NOT NULL,
	"printerId" integer NOT NULL,
	"code" varchar(50),
	"name" varchar(300) NOT NULL,
	"type" "supply_type" NOT NULL,
	"color" varchar(100),
	"colorHex" varchar(7),
	"unit" varchar(50) DEFAULT 'un' NOT NULL,
	"currentStock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 1 NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateId" integer NOT NULL,
	"actionId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"moduleId" integer NOT NULL,
	"actionId" integer NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64) DEFAULT 'oauth',
	"passwordHash" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"isApproved" boolean DEFAULT false NOT NULL,
	"avatarUrl" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "auditLogs_userId_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "auditLogs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "auditLogs_module_idx" ON "audit_logs" USING btree ("module");--> statement-breakpoint
CREATE UNIQUE INDEX "emailVerificationTokens_token_idx" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "inspectionItems_inspectionId_idx" ON "inspection_items" USING btree ("inspectionId");--> statement-breakpoint
CREATE INDEX "inspectionItems_orderItemId_idx" ON "inspection_items" USING btree ("orderItemId");--> statement-breakpoint
CREATE INDEX "inspectionReports_inspectionId_idx" ON "inspection_reports" USING btree ("inspectionId");--> statement-breakpoint
CREATE INDEX "inspectionReports_status_idx" ON "inspection_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loginAttempts_email_idx" ON "login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "loginAttempts_createdAt_idx" ON "login_attempts" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "notificationEmails_email_idx" ON "notification_emails" USING btree ("email");--> statement-breakpoint
CREATE INDEX "orderConfirmations_orderId_idx" ON "order_confirmations" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "orderConfirmations_userId_idx" ON "order_confirmations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "orderInspections_orderId_idx" ON "order_inspections" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "orderInspections_status_idx" ON "order_inspections" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "passwordResetTokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "permissionActions_moduleId_idx" ON "permission_actions" USING btree ("moduleId");--> statement-breakpoint
CREATE UNIQUE INDEX "permissionModules_name_idx" ON "permission_modules" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "permissionTemplates_name_idx" ON "permission_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "printers_brand_idx" ON "printers" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "purchaseOrderItems_orderId_idx" ON "purchase_order_items" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "purchaseOrderItems_supplyId_idx" ON "purchase_order_items" USING btree ("supplyId");--> statement-breakpoint
CREATE INDEX "purchaseOrders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchaseOrders_userId_idx" ON "purchase_orders" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "purchaseRequests_orderId_idx" ON "purchase_requests" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "purchaseRequests_status_idx" ON "purchase_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rolePermissions_roleId_idx" ON "role_permissions" USING btree ("roleId");--> statement-breakpoint
CREATE INDEX "rolePermissions_moduleId_idx" ON "role_permissions" USING btree ("moduleId");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "scheduledReports_userId_idx" ON "scheduled_reports" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "scheduledReports_isActive_idx" ON "scheduled_reports" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "stockMovements_supplyId_idx" ON "stock_movements" USING btree ("supplyId");--> statement-breakpoint
CREATE INDEX "stockMovements_userId_idx" ON "stock_movements" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "stockMovements_movementDate_idx" ON "stock_movements" USING btree ("movementDate");--> statement-breakpoint
CREATE INDEX "supplies_printerId_idx" ON "supplies" USING btree ("printerId");--> statement-breakpoint
CREATE INDEX "supplies_type_idx" ON "supplies" USING btree ("type");--> statement-breakpoint
CREATE INDEX "templatePermissions_templateId_idx" ON "template_permissions" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "userPermissions_userId_idx" ON "user_permissions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "userPermissions_moduleId_idx" ON "user_permissions" USING btree ("moduleId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_openId_idx" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");