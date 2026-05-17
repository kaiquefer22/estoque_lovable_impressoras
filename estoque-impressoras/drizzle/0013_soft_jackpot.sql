CREATE TABLE `order_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int NOT NULL,
	`confirmedAt` bigint NOT NULL,
	`withEntry` int NOT NULL DEFAULT 0,
	`itemIds` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_confirmations_id` PRIMARY KEY(`id`)
);
