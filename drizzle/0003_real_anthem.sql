CREATE TABLE "institutional_roles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "institutional_roles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name_ms" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutional_roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "item_roles" (
	"item_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_roles" ADD CONSTRAINT "item_roles_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_roles" ADD CONSTRAINT "item_roles_role_id_institutional_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."institutional_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_item_roles_item" ON "item_roles" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_item_roles_role" ON "item_roles" USING btree ("role_id");
--> statement-breakpoint
INSERT INTO "institutional_roles" ("code", "name_ms", "description", "sort_order") VALUES
  ('solat',        'Peralatan Solat',    'Barang untuk keperluan solat dan ibadah harian',     1),
  ('jenazah',      'Peralatan Jenazah',  'Barang untuk urusan jenazah dan pengebumian',         2),
  ('majlis',       'Peralatan Majlis',   'Barang untuk majlis, kenduri, dan program komuniti',  3),
  ('pejabat',      'Pejabat',            'Barang untuk keperluan pentadbiran dan pejabat',      4),
  ('infrastruktur','Infrastruktur',      'Peralatan tetap bangunan dan kemudahan masjid',       5),
  ('lain',         'Lain-lain',          'Peranan lain yang tidak tersenarai',                  6)
ON CONFLICT ("code") DO NOTHING;