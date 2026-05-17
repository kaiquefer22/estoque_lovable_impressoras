CREATE TABLE `scheduled_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`frequency` enum('weekly','monthly','custom') NOT NULL,
	`dayOfWeek` int,
	`dayOfMonth` int,
	`time` varchar(5),
	`recipientEmails` text,
	`includeGraphs` boolean NOT NULL DEFAULT true,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSentAt` timestamp,
	`nextSendAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_reports_id` PRIMARY KEY(`id`)
);
