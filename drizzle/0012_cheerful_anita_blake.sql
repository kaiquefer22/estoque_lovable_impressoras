CREATE TABLE `permission_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permission_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `permission_templates_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `template_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`actionId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_permissions_id` PRIMARY KEY(`id`)
);
