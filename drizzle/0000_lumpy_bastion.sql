CREATE TABLE `rooms` (
	`pin` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
