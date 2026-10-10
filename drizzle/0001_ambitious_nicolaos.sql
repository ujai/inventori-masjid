-- Add prefix column to categories with safe backfill for existing rows.
ALTER TABLE "categories" ADD COLUMN "prefix" text;--> statement-breakpoint

-- Backfill existing categories with their assigned prefixes
UPDATE "categories" SET "prefix" = 'DWN' WHERE "code" = 'dewan_solat';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'MSL' WHERE "code" = 'muslimat';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'ELK' WHERE "code" = 'elektronik';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'FSI' WHERE "code" = 'fasiliti';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'PEJ' WHERE "code" = 'pejabat';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'DPR' WHERE "code" = 'dapur';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'KBS' WHERE "code" = 'kebersihan';--> statement-breakpoint
UPDATE "categories" SET "prefix" = 'LAI' WHERE "code" = 'lain_lain';--> statement-breakpoint

-- Now enforce NOT NULL and uniqueness
ALTER TABLE "categories" ALTER COLUMN "prefix" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_prefix_unique" UNIQUE("prefix");
