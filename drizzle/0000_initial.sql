CREATE TYPE "public"."acquisition_method" AS ENUM('beli', 'sewa', 'sumbangan');--> statement-breakpoint
CREATE TYPE "public"."disposal_reason" AS ENUM('rosak_total', 'dijual_besi_buruk', 'dijual_terpakai', 'sumbangan_keluar', 'hilang', 'dicuri', 'lain_lain');--> statement-breakpoint
CREATE TYPE "public"."item_condition" AS ENUM('baik', 'sederhana', 'rosak');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('aktif', 'tidak_cukup', 'rosak', 'dalam_servis', 'dilupuskan', 'dipinjam', 'hilang');--> statement-breakpoint
CREATE TYPE "public"."movement_purpose" AS ENUM('pinjam', 'pindah_lokasi', 'kenduri', 'kelas', 'qurban', 'lain');--> statement-breakpoint
CREATE TYPE "public"."item_tracking_mode" AS ENUM('quantity', 'asset');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'ajk');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "attachments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"kind" text NOT NULL,
	"r2_key" text NOT NULL,
	"file_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_kind_check" CHECK ("attachments"."kind" IN ('photo','barcode','qr','document','police_report'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name_ms" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disposal_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "disposal_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"disposal_date" date NOT NULL,
	"reason" "disposal_reason" NOT NULL,
	"quantity_disposed" integer NOT NULL,
	"police_report_reference" text,
	"police_report_attachment_id" integer,
	"sale_amount" numeric(12, 2),
	"buyer" text,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disposal_qty_check" CHECK ("disposal_logs"."quantity_disposed" > 0)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"category_id" integer NOT NULL,
	"unit_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"current_location_id" integer NOT NULL,
	"status" "item_status" DEFAULT 'aktif' NOT NULL,
	"notes" text,
	"tracking_mode" "item_tracking_mode" DEFAULT 'quantity' NOT NULL,
	"asset_code" text,
	"acquired_date" date,
	"price" numeric(12, 2),
	"acquisition_method" "acquisition_method",
	"supplier" text,
	"receipt_reference" text,
	"last_service_date" date,
	"next_service_date" date,
	"expiry_date" date,
	"condition" "item_condition",
	"maintenance_notes" text,
	"responsible_user_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_asset_code_unique" UNIQUE("asset_code"),
	CONSTRAINT "items_asset_requires_code" CHECK ("items"."tracking_mode" = 'quantity' OR "items"."asset_code" IS NOT NULL),
	CONSTRAINT "items_asset_qty_one" CHECK ("items"."tracking_mode" = 'quantity' OR "items"."quantity" = 1),
	CONSTRAINT "items_qty_non_neg" CHECK ("items"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name_ms" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maintenance_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"service_date" date NOT NULL,
	"next_service_date" date,
	"condition_before" "item_condition",
	"condition_after" "item_condition",
	"cost" numeric(12, 2),
	"notes" text,
	"performed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movement_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "movement_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"quantity_moved" integer NOT NULL,
	"from_location_id" integer,
	"to_location_id" integer,
	"purpose" "movement_purpose" NOT NULL,
	"borrower_name" text,
	"expected_return_date" date,
	"returned_date" date,
	"notes" text,
	"handled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movement_qty_check" CHECK ("movement_logs"."quantity_moved" > 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "telegram_link_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name_ms" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'ajk' NOT NULL,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"telegram_chat_id" text,
	"telegram_username" text,
	"notification_email_enabled" boolean DEFAULT true NOT NULL,
	"notification_telegram_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposal_logs" ADD CONSTRAINT "disposal_logs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposal_logs" ADD CONSTRAINT "disposal_logs_police_report_attachment_id_attachments_id_fk" FOREIGN KEY ("police_report_attachment_id") REFERENCES "public"."attachments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disposal_logs" ADD CONSTRAINT "disposal_logs_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_current_location_id_locations_id_fk" FOREIGN KEY ("current_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_responsible_user_id_user_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_performed_by_user_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_actor" ON "activity_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idx_activity_entity" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_activity_created" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_attachments_item" ON "attachments" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_attachments_kind" ON "attachments" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_disposal_item" ON "disposal_logs" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_disposal_reason" ON "disposal_logs" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "idx_disposal_date" ON "disposal_logs" USING btree ("disposal_date");--> statement-breakpoint
CREATE INDEX "idx_items_category" ON "items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_items_location" ON "items" USING btree ("current_location_id");--> statement-breakpoint
CREATE INDEX "idx_items_status" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_items_cat_loc" ON "items" USING btree ("category_id","current_location_id");--> statement-breakpoint
CREATE INDEX "idx_items_next_service" ON "items" USING btree ("next_service_date");--> statement-breakpoint
CREATE INDEX "idx_items_expiry" ON "items" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_items_responsible" ON "items" USING btree ("responsible_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_items_supplier_receipt" ON "items" USING btree ("supplier","receipt_reference");--> statement-breakpoint
CREATE INDEX "idx_maintenance_item" ON "maintenance_logs" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_maintenance_service_date" ON "maintenance_logs" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "idx_movement_item" ON "movement_logs" USING btree ("item_id");