CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`supplyId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` varchar(20),
	`expectedReturnDate` bigint,
	`notes` text,
	`received` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(100),
	`supplier` varchar(300) NOT NULL,
	`status` enum('pendente','em_transito','entregue','cancelado') NOT NULL DEFAULT 'pendente',
	`orderDate` bigint NOT NULL,
	`estimatedDelivery` bigint,
	`actualDelivery` bigint,
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;