CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(200) NOT NULL,
	`action` enum('create','update','delete','view','export') NOT NULL,
	`module` varchar(100) NOT NULL,
	`entityId` int,
	`entityName` varchar(300),
	`details` text,
	`timestamp` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
