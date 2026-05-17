import { 
  pgTable, 
  serial, 
  pgEnum, 
  text, 
  timestamp, 
  varchar, 
  bigint, 
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ==================== ENUMS ====================

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const movementTypeEnum = pgEnum("movement_type", ["entrada", "saida"]);
export const orderStatusEnum = pgEnum("order_status", ["pendente", "em_transito", "entregue", "cancelado"]);
export const supplyTypeEnum = pgEnum("supply_type", ["cartucho", "papel", "tanque_manutencao"]);
export const notificationTypeEnum = pgEnum("notification_type", ["solicitacao", "conferencia", "ambos"]);
export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", ["rascunho", "enviado", "confirmado", "cancelado"]);
export const inspectionStatusEnum = pgEnum("inspection_status", ["em_andamento", "concluida", "cancelada"]);
export const inspectionItemStatusEnum = pgEnum("inspection_item_status", ["ok", "parcial", "faltante", "danificado"]);
export const inspectionReportStatusEnum = pgEnum("inspection_report_status", ["gerado", "enviado", "cancelado"]);

/**
 * Core user table backing auth flow.
 * Includes avatarUrl for profile photo.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }).unique(),
    loginMethod: varchar("loginMethod", { length: 64 }).default("oauth"),
    passwordHash: text("passwordHash"),
    role: roleEnum("role").default("user").notNull(),
    isApproved: boolean("isApproved").default(false).notNull(),
    avatarUrl: text("avatarUrl"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_openId_idx").on(table.openId),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Impressoras (printers) - modelos de impressoras cadastrados no sistema
 */
export const printers = pgTable(
  "printers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    model: varchar("model", { length: 200 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull().default("Epson"),
    description: text("description"),
    imageUrl: text("imageUrl"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("printers_brand_idx").on(table.brand),
  ]
);

export type Printer = typeof printers.$inferSelect;
export type InsertPrinter = typeof printers.$inferInsert;

/**
 * Insumos (supplies) - cartuchos, papéis, tanques de manutenção
 * Cada insumo é vinculado a uma impressora
 */
export const supplies = pgTable(
  "supplies",
  {
    id: serial("id").primaryKey(),
    printerId: integer("printerId").notNull(),
    code: varchar("code", { length: 50 }),
    name: varchar("name", { length: 300 }).notNull(),
    type: supplyTypeEnum("type").notNull(),
    color: varchar("color", { length: 100 }),
    colorHex: varchar("colorHex", { length: 7 }),
    unit: varchar("unit", { length: 50 }).notNull().default("un"),
    currentStock: integer("currentStock").notNull().default(0),
    minStock: integer("minStock").notNull().default(1),
    description: text("description"),
    imageUrl: text("imageUrl"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("supplies_printerId_idx").on(table.printerId),
    index("supplies_type_idx").on(table.type),
  ]
);

export type Supply = typeof supplies.$inferSelect;
export type InsertSupply = typeof supplies.$inferInsert;

/**
 * Movimentações de estoque (stock_movements)
 * Registra toda entrada e saída de insumos com data/hora e usuário responsável
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    supplyId: integer("supplyId").notNull(),
    type: movementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    previousStock: integer("previousStock").notNull().default(0),
    newStock: integer("newStock").notNull().default(0),
    notes: text("notes"),
    userId: integer("userId"),
    movementDate: bigint("movementDate", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("stockMovements_supplyId_idx").on(table.supplyId),
    index("stockMovements_userId_idx").on(table.userId),
    index("stockMovements_movementDate_idx").on(table.movementDate),
  ]
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = typeof stockMovements.$inferInsert;

/**
 * Pedidos em trânsito (purchase_orders)
 * Registra pedidos feitos a fornecedores com estimativa de entrega
 */
export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("orderNumber", { length: 100 }),
    supplier: varchar("supplier", { length: 300 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pendente"),
    orderDate: bigint("orderDate", { mode: "number" }).notNull(),
    estimatedDelivery: bigint("estimatedDelivery", { mode: "number" }),
    actualDelivery: bigint("actualDelivery", { mode: "number" }),
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("purchaseOrders_status_idx").on(table.status),
    index("purchaseOrders_userId_idx").on(table.userId),
  ]
);

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Itens do pedido (purchase_order_items)
 * Vincula insumos a um pedido com quantidade e previsão de retorno
 */
export const purchaseOrderItems = pgTable(
  "purchase_order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    supplyId: integer("supplyId").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: varchar("unitPrice", { length: 20 }),
    expectedReturnDate: bigint("expectedReturnDate", { mode: "number" }),
    notes: text("notes"),
    received: boolean("received").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("purchaseOrderItems_orderId_idx").on(table.orderId),
    index("purchaseOrderItems_supplyId_idx").on(table.supplyId),
  ]
);

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * E-mails de configuração (notification_emails)
 * Armazena os e-mails para recebimento de solicitações e conferências
 */
export const notificationEmails = pgTable(
  "notification_emails",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    type: notificationTypeEnum("type").notNull().default("ambos"),
    isActive: boolean("isActive").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("notificationEmails_email_idx").on(table.email),
  ]
);

export type NotificationEmail = typeof notificationEmails.$inferSelect;
export type InsertNotificationEmail = typeof notificationEmails.$inferInsert;

/**
 * Solicitações de pedidos (purchase_requests)
 * Registra solicitações de pedidos com data de envio e status
 */
export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    requestDate: bigint("requestDate", { mode: "number" }).notNull(),
    sentDate: bigint("sentDate", { mode: "number" }),
    status: purchaseRequestStatusEnum("status").notNull().default("rascunho"),
    recipientEmails: text("recipientEmails"), // JSON array of emails
    csvData: text("csvData"), // CSV content sent
    notes: text("notes"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("purchaseRequests_orderId_idx").on(table.orderId),
    index("purchaseRequests_status_idx").on(table.status),
  ]
);

export type PurchaseRequest = typeof purchaseRequests.$inferSelect;
export type InsertPurchaseRequest = typeof purchaseRequests.$inferInsert;

/**
 * Conferências de pedidos (order_inspections)
 * Registra conferências de pedidos com checklist de itens
 */
export const orderInspections = pgTable(
  "order_inspections",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    inspectionDate: bigint("inspectionDate", { mode: "number" }).notNull(),
    status: inspectionStatusEnum("status").notNull().default("em_andamento"),
    notes: text("notes"),
    userId: integer("userId"),
    hasEntryApproval: boolean("hasEntryApproval").default(false).notNull(),
    entryApprovedAt: bigint("entryApprovedAt", { mode: "number" }),
    entryApprovedBy: integer("entryApprovedBy"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orderInspections_orderId_idx").on(table.orderId),
    index("orderInspections_status_idx").on(table.status),
  ]
);

export type OrderInspection = typeof orderInspections.$inferSelect;
export type InsertOrderInspection = typeof orderInspections.$inferInsert;

/**
 * Itens conferidos (inspection_items)
 * Registra quais itens foram conferidos em uma inspeção
 */
export const inspectionItems = pgTable(
  "inspection_items",
  {
    id: serial("id").primaryKey(),
    inspectionId: integer("inspectionId").notNull(),
    orderItemId: integer("orderItemId").notNull(),
    quantityReceived: integer("quantityReceived").notNull(),
    quantityExpected: integer("quantityExpected").notNull(),
    status: inspectionItemStatusEnum("status").notNull().default("ok"),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inspectionItems_inspectionId_idx").on(table.inspectionId),
    index("inspectionItems_orderItemId_idx").on(table.orderItemId),
  ]
);

export type InspectionItem = typeof inspectionItems.$inferSelect;
export type InsertInspectionItem = typeof inspectionItems.$inferInsert;

/**
 * Relatórios de conferência (inspection_reports)
 * Armazena os relatórios gerados após conferência
 */
export const inspectionReports = pgTable(
  "inspection_reports",
  {
    id: serial("id").primaryKey(),
    inspectionId: integer("inspectionId").notNull(),
    reportDate: bigint("reportDate", { mode: "number" }).notNull(),
    sentDate: bigint("sentDate", { mode: "number" }),
    recipientEmails: text("recipientEmails"), // JSON array of emails
    csvData: text("csvData"), // CSV content sent
    status: inspectionReportStatusEnum("status").notNull().default("gerado"),
    userId: integer("userId"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("inspectionReports_inspectionId_idx").on(table.inspectionId),
    index("inspectionReports_status_idx").on(table.status),
  ]
);

export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertInspectionReport = typeof inspectionReports.$inferInsert;

/**
 * Confirmações de conferência (order_confirmations)
 * Registra quando um usuário confere um pedido (sem necessariamente dar entrada)
 */
export const orderConfirmations = pgTable(
  "order_confirmations",
  {
    id: serial("id").primaryKey(),
    orderId: integer("orderId").notNull(),
    userId: integer("userId").notNull(),
    confirmedAt: bigint("confirmedAt", { mode: "number" }).notNull(),
    withEntry: boolean("withEntry").notNull().default(false), // true = conferiu E deu entrada, false = só conferiu
    itemIds: text("itemIds"), // JSON array of item IDs that were confirmed
    notes: text("notes"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orderConfirmations_orderId_idx").on(table.orderId),
    index("orderConfirmations_userId_idx").on(table.userId),
  ]
);

export type OrderConfirmation = typeof orderConfirmations.$inferSelect;
export type InsertOrderConfirmation = typeof orderConfirmations.$inferInsert;


// ==================== PERMISSIONS ====================

/**
 * Módulos do sistema com suas ações permitidas
 */
export const permissionModules = pgTable(
  "permission_modules",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(), // "printers", "supplies", "entrada", etc
    displayName: varchar("displayName", { length: 200 }).notNull(), // "Impressoras", "Insumos", etc
    description: text("description"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("permissionModules_name_idx").on(table.name),
  ]
);

export type PermissionModule = typeof permissionModules.$inferSelect;
export type InsertPermissionModule = typeof permissionModules.$inferInsert;

/**
 * Ações disponíveis para cada módulo
 */
export const permissionActions = pgTable(
  "permission_actions",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("moduleId").notNull(),
    name: varchar("name", { length: 100 }).notNull(), // "view", "create", "edit", "delete", "report"
    displayName: varchar("displayName", { length: 200 }).notNull(), // "Visualizar", "Cadastrar", etc
    description: text("description"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("permissionActions_moduleId_idx").on(table.moduleId),
    uniqueIndex("permissionActions_moduleId_name_idx").on(table.moduleId, table.name),
  ]
);

export type PermissionAction = typeof permissionActions.$inferSelect;
export type InsertPermissionAction = typeof permissionActions.$inferInsert;

/**
 * Roles (papéis) do sistema com permissões pré-configuradas
 */
export const roles = pgTable(
  "roles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(), // "admin", "gerente", "operador"
    displayName: varchar("displayName", { length: 200 }).notNull(),
    description: text("description"),
    isSystem: boolean("isSystem").notNull().default(false), // true para roles do sistema (não editáveis)
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("roles_name_idx").on(table.name),
  ]
);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

/**
 * Permissões de roles (relação muitos-para-muitos)
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: serial("id").primaryKey(),
    roleId: integer("roleId").notNull(),
    moduleId: integer("moduleId").notNull(),
    actionId: integer("actionId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("rolePermissions_roleId_idx").on(table.roleId),
    index("rolePermissions_moduleId_idx").on(table.moduleId),
  ]
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

/**
 * Permissões de usuários (override das permissões de role)
 */
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    moduleId: integer("moduleId").notNull(),
    actionId: integer("actionId").notNull(),
    granted: boolean("granted").notNull().default(true), // true = concedido, false = negado (override)
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("userPermissions_userId_idx").on(table.userId),
    index("userPermissions_moduleId_idx").on(table.moduleId),
  ]
);

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;


// ==================== AUDIT LOGS ====================

/**
 * Logs de auditoria - registra todas as ações de CRUD
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    userName: varchar("userName", { length: 200 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(), // "create", "update", "delete", "view", "export"
    module: varchar("module", { length: 100 }).notNull(), // "printers", "supplies", "movements", "orders"
    entityId: integer("entityId"),
    entityName: varchar("entityName", { length: 300 }), // nome da entidade afetada
    details: text("details"), // JSON com detalhes da ação
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("auditLogs_userId_idx").on(table.userId),
    index("auditLogs_timestamp_idx").on(table.timestamp),
    index("auditLogs_module_idx").on(table.module),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Password reset tokens - para recuperação de senha
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    usedAt: timestamp("usedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("passwordResetTokens_token_idx").on(table.token),
  ]
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Login attempts - para rate limiting
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("loginAttempts_email_idx").on(table.email),
    index("loginAttempts_createdAt_idx").on(table.createdAt),
  ]
);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;


/**
 * Email verification tokens - para confirmar email ao registrar
 */
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verifiedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("emailVerificationTokens_token_idx").on(table.token),
  ]
);

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

/**
 * Permission Templates - Perfis pré-definidos com conjuntos de permissões
 * Exemplos: Operador, Gerente, Visualizador
 */
export const permissionTemplates = pgTable(
  "permission_templates",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("permissionTemplates_name_idx").on(table.name),
  ]
);

export type PermissionTemplate = typeof permissionTemplates.$inferSelect;
export type InsertPermissionTemplate = typeof permissionTemplates.$inferInsert;

/**
 * Template Permissions - Mapeamento entre templates e permissões
 */
export const templatePermissions = pgTable(
  "template_permissions",
  {
    id: serial("id").primaryKey(),
    templateId: integer("templateId").notNull(),
    actionId: integer("actionId").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("templatePermissions_templateId_idx").on(table.templateId),
  ]
);

export type TemplatePermission = typeof templatePermissions.$inferSelect;
export type InsertTemplatePermission = typeof templatePermissions.$inferInsert;


/**
 * Scheduled Reports - Agendamento automático de relatórios por e-mail
 */
export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    frequency: varchar("frequency", { length: 50 }).notNull(), // "weekly", "monthly", "custom"
    dayOfWeek: integer("dayOfWeek"), // 0-6 para semanal (0=domingo)
    dayOfMonth: integer("dayOfMonth"), // 1-31 para mensal
    time: varchar("time", { length: 5 }), // HH:MM formato
    recipientEmails: text("recipientEmails"), // JSON array de emails
    includeGraphs: boolean("includeGraphs").default(true).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    lastSentAt: timestamp("lastSentAt", { withTimezone: true }),
    nextSendAt: timestamp("nextSendAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scheduledReports_userId_idx").on(table.userId),
    index("scheduledReports_isActive_idx").on(table.isActive),
  ]
);

export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = typeof scheduledReports.$inferInsert;


// ==================== EMAIL TRACKING ====================

export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "open",
  "click",
  "bounce",
  "unsubscribe",
  "spam_report",
]);

/**
 * Tracks email events from SendGrid webhooks
 * Records delivery status, opens, clicks, bounces, etc.
 */
export const emailEvents = pgTable(
  "email_events",
  {
    id: serial("id").primaryKey(),
    requestId: integer("requestId").notNull().references(() => purchaseRequests.id, { onDelete: "cascade" }),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    eventType: emailEventTypeEnum("eventType").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    metadata: text("metadata"), // JSON with additional data (user agent, ip, url clicked, etc)
    sendgridEventId: varchar("sendgridEventId", { length: 255 }).unique(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("emailEvents_requestId_idx").on(table.requestId),
    index("emailEvents_recipientEmail_idx").on(table.recipientEmail),
    index("emailEvents_eventType_idx").on(table.eventType),
    index("emailEvents_timestamp_idx").on(table.timestamp),
  ]
);

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

/**
 * Summary of purchase request delivery status
 * Aggregates email events for each request
 */
export const purchaseRequestSummary = pgTable(
  "purchase_request_summary",
  {
    id: serial("id").primaryKey(),
    requestId: integer("requestId").notNull().unique().references(() => purchaseRequests.id, { onDelete: "cascade" }),
    totalRecipients: integer("totalRecipients").notNull().default(0),
    deliveredCount: integer("deliveredCount").notNull().default(0),
    openedCount: integer("openedCount").notNull().default(0),
    clickedCount: integer("clickedCount").notNull().default(0),
    bounceCount: integer("bounceCount").notNull().default(0),
    lastEventAt: timestamp("lastEventAt", { withTimezone: true }),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("purchaseRequestSummary_requestId_idx").on(table.requestId),
  ]
);

export type PurchaseRequestSummary = typeof purchaseRequestSummary.$inferSelect;
export type InsertPurchaseRequestSummary = typeof purchaseRequestSummary.$inferInsert;


/**
 * Transferências de insumos entre empresas (Studiolaser → CHIC)
 * Rastreia movimentação de estoque entre empresas
 */
export const supplyTransfers = pgTable(
  "supply_transfers",
  {
    id: serial("id").primaryKey(),
    supplyId: integer("supplyId").notNull(),
    fromCompanyId: integer("fromCompanyId").notNull().default(1), // Studiolaser
    toCompanyId: integer("toCompanyId").notNull().default(2), // CHIC
    quantity: integer("quantity").notNull(),
    transferDate: bigint("transferDate", { mode: "number" }).notNull(), // Unix timestamp
    notes: text("notes"),
    transferredBy: integer("transferredBy").notNull(), // User ID
    isActive: boolean("isActive").notNull().default(true),
    status: text("status").notNull().default("pendente"), // 'pendente' ou 'confirmado'
    createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  },
  (table) => [
    index("supplyTransfers_supplyId_idx").on(table.supplyId),
    index("supplyTransfers_fromCompanyId_idx").on(table.fromCompanyId),
    index("supplyTransfers_toCompanyId_idx").on(table.toCompanyId),
    index("supplyTransfers_transferDate_idx").on(table.transferDate),
  ]
);

export type SupplyTransfer = typeof supplyTransfers.$inferSelect;
export type InsertSupplyTransfer = typeof supplyTransfers.$inferInsert;


/**
 * Despachos de insumos para CHIC
 * Registra movimentação de insumos da Studiolaser para CHIC
 */
export const dispatches = pgTable(
  "dispatches",
  {
    id: serial("id").primaryKey(),
    supplyId: integer("supplyId").notNull(),
    quantity: integer("quantity").notNull(),
    dispatchDate: bigint("dispatchDate", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
    dispatchedBy: integer("dispatchedBy").notNull(), // User ID
    notes: text("notes"),
    status: text("status").notNull().default("pendente"), // 'pendente' ou 'confirmado'
    receivedAt: timestamp("receivedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dispatches_supplyId_idx").on(table.supplyId),
    index("dispatches_status_idx").on(table.status),
    index("dispatches_dispatchedBy_idx").on(table.dispatchedBy),
  ]
);

export type Dispatch = typeof dispatches.$inferSelect;
export type InsertDispatch = typeof dispatches.$inferInsert;

export const chicConsumptions = pgTable(
  "chic_consumptions",
  {
    id: serial("id").primaryKey(),
    supplyId: integer("supplyId").notNull(),
    quantity: integer("quantity").notNull(),
    consumptionDate: bigint("consumptionDate", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
    recordedBy: integer("recordedBy").notNull(), // User ID
    notes: text("notes"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("chic_consumptions_supplyId_idx").on(table.supplyId),
    index("chic_consumptions_recordedBy_idx").on(table.recordedBy),
  ]
);

export type ChicConsumption = typeof chicConsumptions.$inferSelect;
export type InsertChicConsumption = typeof chicConsumptions.$inferInsert;
