ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'oauth';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);