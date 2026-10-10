DROP INDEX "idx_item_roles_item";--> statement-breakpoint
ALTER TABLE "item_roles" ADD CONSTRAINT "item_roles_item_id_role_id_pk" PRIMARY KEY("item_id","role_id");