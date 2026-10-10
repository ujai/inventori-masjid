ALTER TABLE "items" ADD COLUMN "maintenance_interval_days" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "warranty_expiry" date;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "expected_lifespan_years" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "minimum_quantity" integer;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD COLUMN "return_condition" "item_condition";