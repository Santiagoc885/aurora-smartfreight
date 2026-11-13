CREATE TABLE `dispatches` (
	`id` text PRIMARY KEY NOT NULL,
	`plate` text NOT NULL,
	`carrier` text NOT NULL,
	`quantities` text NOT NULL,
	`weight` integer NOT NULL,
	`capacity` integer NOT NULL,
	`occupancy` real NOT NULL,
	`fare` integer NOT NULL,
	`deliveries` text NOT NULL,
	`created_at` text NOT NULL
);
