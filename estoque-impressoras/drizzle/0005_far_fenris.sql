CREATE TABLE `inspection_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionId` int NOT NULL,
	`orderItemId` int NOT NULL,
	`quantityReceived` int NOT NULL,
	`quantityExpected` int NOT NULL,
	`status` enum('ok','parcial','faltante','danificado') NOT NULL DEFAULT 'ok',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspection_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inspectionId` int NOT NULL,
	`reportDate` bigint NOT NULL,
	`sentDate` bigint,
	`recipientEmails` text,
	`csvData` text,
	`status` enum('gerado','enviado','cancelado') NOT NULL DEFAULT 'gerado',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inspection_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`type` enum('solicitacao','conferencia','ambos') NOT NULL DEFAULT 'ambos',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_emails_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `order_inspections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`inspectionDate` bigint NOT NULL,
	`status` enum('em_andamento','concluida','cancelada') NOT NULL DEFAULT 'em_andamento',
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_inspections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`requestDate` bigint NOT NULL,
	`sentDate` bigint,
	`status` enum('rascunho','enviado','confirmado','cancelado') NOT NULL DEFAULT 'rascunho',
	`recipientEmails` text,
	`csvData` text,
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`)
);
