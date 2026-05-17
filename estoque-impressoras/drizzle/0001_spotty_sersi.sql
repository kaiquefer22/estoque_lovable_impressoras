CREATE TABLE `printers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`model` varchar(200) NOT NULL,
	`brand` varchar(100) NOT NULL DEFAULT 'Epson',
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `printers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplyId` int NOT NULL,
	`movementType` enum('entrada','saida') NOT NULL,
	`quantity` int NOT NULL,
	`previousStock` int NOT NULL DEFAULT 0,
	`newStock` int NOT NULL DEFAULT 0,
	`notes` text,
	`userId` int,
	`movementDate` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`printerId` int NOT NULL,
	`code` varchar(50),
	`name` varchar(300) NOT NULL,
	`type` enum('cartucho','papel','tanque_manutencao') NOT NULL,
	`color` varchar(100),
	`colorHex` varchar(7),
	`unit` varchar(50) NOT NULL DEFAULT 'un',
	`currentStock` int NOT NULL DEFAULT 0,
	`minStock` int NOT NULL DEFAULT 1,
	`description` text,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplies_id` PRIMARY KEY(`id`)
);
