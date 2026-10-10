import { relations } from 'drizzle-orm';
import {
  user, items, categories, locations, units,
  maintenanceLogs, movementLogs, attachments, disposalLogs,
  institutionalRoles, itemRoles,
} from './schema';

export const itemsRelations = relations(items, ({ one, many }) => ({
  category:    one(categories, { fields: [items.categoryId], references: [categories.id] }),
  location:    one(locations,  { fields: [items.currentLocationId], references: [locations.id] }),
  unit:        one(units,      { fields: [items.unitId], references: [units.id] }),
  responsible: one(user,       { fields: [items.responsibleUserId], references: [user.id] }),
  creator:     one(user,       { fields: [items.createdBy], references: [user.id] }),
  maintenance: many(maintenanceLogs),
  movements:   many(movementLogs),
  attachments: many(attachments),
  disposals:   many(disposalLogs),
  roles:       many(itemRoles),
}));

export const institutionalRolesRelations = relations(institutionalRoles, ({ many }) => ({
  itemRoles: many(itemRoles),
}));

export const itemRolesRelations = relations(itemRoles, ({ one }) => ({
  item: one(items,              { fields: [itemRoles.itemId], references: [items.id] }),
  role: one(institutionalRoles, { fields: [itemRoles.roleId], references: [institutionalRoles.id] }),
}));

export const maintenanceLogsRelations = relations(maintenanceLogs, ({ one }) => ({
  item:      one(items, { fields: [maintenanceLogs.itemId], references: [items.id] }),
  performer: one(user,  { fields: [maintenanceLogs.performedBy], references: [user.id] }),
}));

export const movementLogsRelations = relations(movementLogs, ({ one }) => ({
  item:         one(items,     { fields: [movementLogs.itemId], references: [items.id] }),
  fromLocation: one(locations, { fields: [movementLogs.fromLocationId], references: [locations.id] }),
  toLocation:   one(locations, { fields: [movementLogs.toLocationId], references: [locations.id] }),
  handler:      one(user,      { fields: [movementLogs.handledBy], references: [user.id] }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  item:     one(items, { fields: [attachments.itemId], references: [items.id] }),
  uploader: one(user,  { fields: [attachments.uploadedBy], references: [user.id] }),
}));

export const disposalLogsRelations = relations(disposalLogs, ({ one }) => ({
  item:             one(items,       { fields: [disposalLogs.itemId], references: [items.id] }),
  recorder:         one(user,        { fields: [disposalLogs.recordedBy], references: [user.id] }),
  policeReportFile: one(attachments, { fields: [disposalLogs.policeReportAttachmentId], references: [attachments.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({ items: many(items) }));
export const locationsRelations  = relations(locations,  ({ many }) => ({ items: many(items) }));
export const unitsRelations      = relations(units,      ({ many }) => ({ items: many(items) }));
