import { createHash, randomBytes } from "crypto";
import { eq, desc, and, gte, lte, sql, asc, like, ne, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser, users,
  printers, InsertPrinter,
  supplies, InsertSupply,
  stockMovements, InsertStockMovement,
  purchaseOrders, InsertPurchaseOrder,
  purchaseOrderItems, InsertPurchaseOrderItem,
  notificationEmails, InsertNotificationEmail,
  purchaseRequests, InsertPurchaseRequest,
  orderInspections, InsertOrderInspection,
  inspectionItems, InsertInspectionItem,
  inspectionReports, InsertInspectionReport,
  orderConfirmations, InsertOrderConfirmation,
  permissionModules, permissionActions, roles, rolePermissions, userPermissions, permissionTemplates, templatePermissions,
  auditLogs, InsertAuditLog,
  passwordResetTokens, InsertPasswordResetToken,
  loginAttempts, InsertLoginAttempt,
  emailVerificationTokens, InsertEmailVerificationToken,
  supplyTransfers, InsertSupplyTransfer,
  chicConsumptions, InsertChicConsumption,
} from "../drizzle/schema";
import { ENV } from './_core/env';

// Período máximo para edição de movimentações retroativas (em dias)
const MAX_RETROACTIVE_EDIT_DAYS = 30;
const MAX_RETROACTIVE_EDIT_MS = MAX_RETROACTIVE_EDIT_DAYS * 24 * 60 * 60 * 1000;

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export async function getDb() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && dbUrl) {
    try {
      _pool = new Pool({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      });
      _db = drizzle(_pool);
      console.log('[Database] Connected successfully');
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

// ==================== USERS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    avatarUrl: users.avatarUrl,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(desc(users.lastSignedIn));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(id: number, data: { name?: string; email?: string; avatarUrl?: string; role?: "user" | "admin" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.email !== undefined) updateSet.email = data.email;
  if (data.avatarUrl !== undefined) updateSet.avatarUrl = data.avatarUrl;
  if (data.role !== undefined) updateSet.role = data.role;
  if (Object.keys(updateSet).length > 0) {
    await db.update(users).set(updateSet).where(eq(users.id, id));
  }
}

// ==================== PRINTERS ====================

export async function getAllPrinters() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(printers).where(eq(printers.isActive, true)).orderBy(asc(printers.name));
}

export async function getPrinterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(printers).where(eq(printers.id, id)).limit(1);
  return result[0];
}

export async function createPrinter(data: Omit<InsertPrinter, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(printers).values(data).returning({ id: printers.id });
  return result[0]?.id || 0;
}

export async function updatePrinter(id: number, data: Partial<InsertPrinter>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(printers).set(data).where(eq(printers.id, id));
}

export async function deletePrinter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(printers).set({ isActive: false }).where(eq(printers.id, id));
}

// ==================== SUPPLIES ====================

export async function getAllSupplies(filters?: {
  printerId?: number;
  type?: string;
  color?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(supplies.isActive, true)];
  if (filters?.printerId) conditions.push(eq(supplies.printerId, filters.printerId));
  if (filters?.type) conditions.push(eq(supplies.type, filters.type as any));
  if (filters?.color) conditions.push(eq(supplies.color, filters.color));
  return db.select().from(supplies).where(and(...conditions)).orderBy(asc(supplies.name));
}

export async function getSupplyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(supplies).where(eq(supplies.id, id)).limit(1);
  return result[0];
}

export async function createSupply(data: Omit<InsertSupply, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(supplies).values(data).returning({ id: supplies.id });
  return result[0]?.id || 0;
}

export async function updateSupply(id: number, data: Partial<InsertSupply>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(supplies).set(data).where(eq(supplies.id, id));
}

export async function deleteSupply(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(supplies).set({ isActive: false }).where(eq(supplies.id, id));
}

export async function getSuppliesWithPrinter(filters?: {
  printerId?: number;
  type?: string;
  color?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(supplies.isActive, true)];
  if (filters?.printerId) conditions.push(eq(supplies.printerId, filters.printerId));
  if (filters?.type) conditions.push(eq(supplies.type, filters.type as any));
  if (filters?.color) conditions.push(eq(supplies.color, filters.color));

  const result = await db
    .select({
      supply: supplies,
      printerName: printers.name,
      printerModel: printers.model,
    })
    .from(supplies)
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(...conditions))
    .orderBy(asc(printers.name), asc(supplies.name));
  return result;
}

export async function getLowStockSupplies() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      supply: supplies,
      printerName: printers.name,
      printerModel: printers.model,
    })
    .from(supplies)
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(
      eq(supplies.isActive, true),
      sql`${supplies.currentStock} <= ${supplies.minStock}`
    ))
    .orderBy(asc(supplies.currentStock));
}

// ==================== STOCK MOVEMENTS ====================

export async function createStockMovement(data: Omit<InsertStockMovement, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const supply = await getSupplyById(data.supplyId);
  if (!supply) throw new Error("Supply not found");

  const previousStock = supply.currentStock;
  let newStock: number;

  if (data.type === "entrada") {
    newStock = previousStock + data.quantity;
  } else {
    newStock = previousStock - data.quantity;
    if (newStock < 0) throw new Error("Estoque insuficiente para esta saída");
  }

  const result = await db.insert(stockMovements).values({
    ...data,
    previousStock,
    newStock,
  }).returning({ id: stockMovements.id });

  await db.update(supplies).set({ currentStock: newStock }).where(eq(supplies.id, data.supplyId));

  // Check if stock is below minimum (only for saida/exit)
  const isAlertActive = data.type === "saida" && newStock < supply.minStock;

  return { id: result[0]?.id || 0, previousStock, newStock, isAlertActive, minStock: supply.minStock };
}

export async function updateStockMovement(
  movementId: number,
  data: { quantity: number; type: string; notes?: string; movementDate?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the original movement
  const originalMovement = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.id, movementId))
    .limit(1);

  if (!originalMovement || originalMovement.length === 0) {
    throw new Error("Movement not found");
  }

  const movement = originalMovement[0];
  
  // Validacao de data retroativa
  const now = Date.now();
  const movementTime = movement.movementDate || 0;
  const timeDifference = now - movementTime;
  
  if (timeDifference > MAX_RETROACTIVE_EDIT_MS) {
    const daysAgo = Math.floor(timeDifference / (24 * 60 * 60 * 1000));
    throw new Error(`Nao eh possivel editar movimentacoes com mais de ${MAX_RETROACTIVE_EDIT_DAYS} dias. Esta movimentacao foi criada ha ${daysAgo} dias.`);
  }
  
  const supply = await getSupplyById(movement.supplyId);
  if (!supply) throw new Error("Supply not found");

  // Reverse the original movement
  let reversedStock = supply.currentStock;
  if (movement.type === "entrada") {
    reversedStock = reversedStock - movement.quantity;
  } else {
    reversedStock = reversedStock + movement.quantity;
  }

  // Apply the new movement
  let newStock: number;
  if (data.type === "entrada") {
    newStock = reversedStock + data.quantity;
  } else {
    newStock = reversedStock - data.quantity;
    if (newStock < 0) throw new Error("Estoque insuficiente para esta saída");
  }

  // Update the movement
  const updateData: any = {
    quantity: data.quantity,
    type: data.type as any,
    previousStock: reversedStock,
    newStock,
    notes: data.notes,
  };
  if (data.movementDate !== undefined) {
    updateData.movementDate = data.movementDate;
  }
  await db
    .update(stockMovements)
    .set(updateData)
    .where(eq(stockMovements.id, movementId));

  // Update the supply stock
  await db
    .update(supplies)
    .set({ currentStock: newStock })
    .where(eq(supplies.id, movement.supplyId));

  return { previousStock: reversedStock, newStock };
}

export async function deleteStockMovement(movementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the movement to delete
  const movement = await db
    .select()
    .from(stockMovements)
    .where(eq(stockMovements.id, movementId))
    .limit(1);

  if (!movement || movement.length === 0) {
    throw new Error("Movement not found");
  }

  const mov = movement[0];
  const supply = await getSupplyById(mov.supplyId);
  if (!supply) throw new Error("Supply not found");

  // Reverse the movement effect on stock
  let newStock = supply.currentStock;
  if (mov.type === "entrada") {
    newStock = newStock - mov.quantity;
  } else {
    newStock = newStock + mov.quantity;
  }

  // Delete the movement
  await db
    .delete(stockMovements)
    .where(eq(stockMovements.id, movementId));

  // Update the supply stock
  await db
    .update(supplies)
    .set({ currentStock: newStock })
    .where(eq(supplies.id, mov.supplyId));

  return { newStock };
}

export async function getStockMovements(filters?: {
  companyId?: number;
  supplyId?: number;
  printerId?: number;
  type?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { movements: [], total: 0 };

  const conditions: any[] = [];
  if (filters?.supplyId) conditions.push(eq(stockMovements.supplyId, filters.supplyId));
  if (filters?.type) conditions.push(eq(stockMovements.type, filters.type as any));
  if (filters?.startDate) conditions.push(gte(stockMovements.movementDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(stockMovements.movementDate, filters.endDate));

  if (filters?.printerId) {
    conditions.push(eq(supplies.printerId, filters.printerId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  const movements = await db
    .select({
      movement: stockMovements,
      supplyName: supplies.name,
      supplyCode: supplies.code,
      supplyColor: supplies.color,
      supplyColorHex: supplies.colorHex,
      supplyType: supplies.type,
      printerName: printers.name,
      printerModel: printers.model,
      userName: users.name,
      userEmail: users.email,
    })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(whereClause)
    .orderBy(desc(stockMovements.movementDate))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return { movements, total };
}

// ==================== PURCHASE ORDERS ====================

export async function createPurchaseOrder(data: Omit<InsertPurchaseOrder, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseOrders).values(data).returning({ id: purchaseOrders.id });
  return result[0]?.id || 0;
}

export async function addPurchaseOrderItems(items: Omit<InsertPurchaseOrderItem, "id" | "createdAt">[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  await db.insert(purchaseOrderItems).values(items);
}

export async function getPurchaseOrders(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };

  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(purchaseOrders.status, filters.status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(whereClause);

  const total = countResult?.count ?? 0;

  const orders = await db
    .select({
      order: purchaseOrders,
      userName: users.name,
    })
    .from(purchaseOrders)
    .leftJoin(users, eq(purchaseOrders.userId, users.id))
    .where(whereClause)
    .orderBy(desc(purchaseOrders.orderDate))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return { orders, total };
}

export async function getPurchaseOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [order] = await db
    .select({
      order: purchaseOrders,
      userName: users.name,
    })
    .from(purchaseOrders)
    .leftJoin(users, eq(purchaseOrders.userId, users.id))
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  if (!order) return undefined;

  const items = await db
    .select({
      item: purchaseOrderItems,
      supplyName: supplies.name,
      supplyCode: supplies.code,
      supplyColor: supplies.color,
      supplyColorHex: supplies.colorHex,
      supplyType: supplies.type,
      printerName: printers.name,
    })
    .from(purchaseOrderItems)
    .innerJoin(supplies, eq(purchaseOrderItems.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(eq(purchaseOrderItems.orderId, id));

  return { ...order, items };
}

export async function updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
}

export async function updatePurchaseOrderItem(id: number, data: { received?: boolean; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseOrderItems).set(data).where(eq(purchaseOrderItems.id, id));
}

export async function markOrderDelivered(orderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get order items
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, orderId));

  const now = Date.now();

  // Create stock entries for each item
  for (const item of items) {
    if (item.received) continue; // skip already received
    await createStockMovement({
      supplyId: item.supplyId,
      type: "entrada",
      quantity: item.quantity,
      notes: `Recebido do pedido #${orderId}`,
      userId,
      movementDate: now,
    });
    await db.update(purchaseOrderItems).set({ received: true }).where(eq(purchaseOrderItems.id, item.id));
  }

  // Update order status
  await db.update(purchaseOrders).set({
    status: "entregue",
    actualDelivery: now,
  }).where(eq(purchaseOrders.id, orderId));
}

export async function getOutOfStockSupplies() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      supply: supplies,
      printerName: printers.name,
      printerModel: printers.model,
    })
    .from(supplies)
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(
      eq(supplies.isActive, true),
      eq(supplies.currentStock, 0)
    ))
    .orderBy(asc(printers.name), asc(supplies.name));
}

// ==================== DASHBOARD ====================

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalPrinters: 0, totalSupplies: 0, totalMovements: 0, lowStockCount: 0, pendingOrders: 0, recentMovements: [] };

  const [printersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(printers)
    .where(eq(printers.isActive, true));

  const [suppliesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(supplies)
    .where(eq(supplies.isActive, true));

  const [movementsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(stockMovements);

  const [lowStock] = await db
    .select({ count: sql<number>`count(*)` })
    .from(supplies)
    .where(and(
      eq(supplies.isActive, true),
      sql`${supplies.currentStock} <= ${supplies.minStock}`
    ));

  const [pendingOrdersCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .where(and(
      ne(purchaseOrders.status, "entregue"),
      ne(purchaseOrders.status, "cancelado")
    ));

  const recentMovements = await db
    .select({
      movement: stockMovements,
      supplyName: supplies.name,
      supplyCode: supplies.code,
      supplyColor: supplies.color,
      supplyColorHex: supplies.colorHex,
      supplyType: supplies.type,
      printerName: printers.name,
      userName: users.name,
    })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .orderBy(desc(stockMovements.movementDate))
    .limit(10);

  return {
    totalPrinters: printersCount?.count ?? 0,
    totalSupplies: suppliesCount?.count ?? 0,
    totalMovements: movementsCount?.count ?? 0,
    lowStockCount: lowStock?.count ?? 0,
    pendingOrders: pendingOrdersCount?.count ?? 0,
    recentMovements,
  };
}

export async function getStockByPrinter() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      printerId: printers.id,
      printerName: printers.name,
      printerModel: printers.model,
      totalSupplies: sql<number>`count(${supplies.id})`,
      totalStock: sql<number>`COALESCE(sum(${supplies.currentStock}), 0)`,
      lowStockItems: sql<number>`sum(case when ${supplies.currentStock} <= ${supplies.minStock} then 1 else 0 end)`,
    })
    .from(printers)
    .leftJoin(supplies, and(eq(supplies.printerId, printers.id), eq(supplies.isActive, true)))
    .where(eq(printers.isActive, true))
    .groupBy(printers.id, printers.name, printers.model);
}


// ==================== NOTIFICATION EMAILS ====================

export async function getAllNotificationEmails() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notificationEmails).where(eq(notificationEmails.isActive, true));
}

export async function createNotificationEmail(data: InsertNotificationEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if email already exists (active or inactive)
  const existing = await db.select().from(notificationEmails).where(eq(notificationEmails.email, data.email));
  if (existing.length > 0) {
    throw new Error("Este e-mail já foi cadastrado");
  }
  
  const result = await db.insert(notificationEmails).values(data).returning({ id: notificationEmails.id });
  return result[0]?.id || 0;
}

export async function deleteNotificationEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notificationEmails).set({ isActive: false }).where(eq(notificationEmails.id, id));
}

// ==================== PURCHASE REQUESTS ====================

export async function createPurchaseRequest(data: InsertPurchaseRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(purchaseRequests).values(data).returning({ id: purchaseRequests.id });
  return result[0]?.id || 0;
}

export async function getPurchaseRequestsByOrder(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseRequests).where(eq(purchaseRequests.orderId, orderId));
}

export async function updatePurchaseRequest(id: number, data: Partial<InsertPurchaseRequest>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(purchaseRequests).set(data).where(eq(purchaseRequests.id, id));
}

// ==================== ORDER INSPECTIONS ====================

export async function createOrderInspection(data: InsertOrderInspection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orderInspections).values(data).returning({ id: orderInspections.id });
  return result[0]?.id || 0;
}

export async function getOrderInspectionsByOrder(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderInspections).where(eq(orderInspections.orderId, orderId));
}

export async function updateOrderInspection(id: number, data: Partial<InsertOrderInspection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orderInspections).set(data).where(eq(orderInspections.id, id));
}

// ==================== INSPECTION ITEMS ====================

export async function createInspectionItem(data: InsertInspectionItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inspectionItems).values(data).returning({ id: inspectionItems.id });
  return result[0]?.id || 0;
}

export async function getInspectionItems(inspectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectionItems).where(eq(inspectionItems.inspectionId, inspectionId));
}

export async function updateInspectionItem(id: number, data: Partial<InsertInspectionItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inspectionItems).set(data).where(eq(inspectionItems.id, id));
}

// ==================== INSPECTION REPORTS ====================

export async function createInspectionReport(data: InsertInspectionReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inspectionReports).values(data).returning({ id: inspectionReports.id });
  return result[0]?.id || 0;
}

export async function getInspectionReportsByInspection(inspectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectionReports).where(eq(inspectionReports.inspectionId, inspectionId));
}

export async function updateInspectionReport(id: number, data: Partial<InsertInspectionReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(inspectionReports).set(data).where(eq(inspectionReports.id, id));
}


// ==================== REPORTS ====================

export async function getMonthlyConsumption(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59).getTime();
  
  return db.select({
    supplyName: supplies.name,
    supplyType: supplies.type,
    printerName: printers.name,
    quantity: stockMovements.quantity,
    type: stockMovements.type,
  })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(
      gte(stockMovements.movementDate, startDate),
      lte(stockMovements.movementDate, endDate),
      eq(stockMovements.type, "saida")
    ));
}

export async function getTopSuppliesByPrinter(printerId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    supplyName: supplies.name,
    supplyCode: supplies.code,
    totalQuantity: sql`SUM(${stockMovements.quantity})`,
  })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .where(and(
      eq(supplies.printerId, printerId),
      eq(stockMovements.type, "saida")
    ))
    .groupBy(supplies.id)
    .orderBy(desc(sql`SUM(${stockMovements.quantity})`))
    .limit(limit);
  
  return result;
}

export async function getPaperConsumption(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59).getTime();
  
  return db.select({
    printerName: printers.name,
    supplyName: supplies.name,
    unit: supplies.unit,
    totalQuantity: sql`SUM(${stockMovements.quantity})`,
  })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(
      gte(stockMovements.movementDate, startDate),
      lte(stockMovements.movementDate, endDate),
      eq(stockMovements.type, "saida"),
      eq(supplies.type, "papel")
    ))
    .groupBy(supplies.id)
    .orderBy(desc(sql`SUM(${stockMovements.quantity})`));
}

export async function getYearlyComparison(year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59).getTime();
  const prevStartDate = new Date(year - 1, month - 1, 1).getTime();
  const prevEndDate = new Date(year - 1, month, 0, 23, 59, 59).getTime();
  
  const current = await db.select({
    supplyName: supplies.name,
    totalQuantity: sql`SUM(${stockMovements.quantity})`,
  })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .where(and(
      gte(stockMovements.movementDate, startDate),
      lte(stockMovements.movementDate, endDate),
      eq(stockMovements.type, "saida")
    ))
    .groupBy(supplies.id);
  
  const previous = await db.select({
    supplyName: supplies.name,
    totalQuantity: sql`SUM(${stockMovements.quantity})`,
  })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .where(and(
      gte(stockMovements.movementDate, prevStartDate),
      lte(stockMovements.movementDate, prevEndDate),
      eq(stockMovements.type, "saida")
    ))
    .groupBy(supplies.id);
  
  return { current, previous };
}

// ==================== YEARLY COMPARISON - ALL MONTHS ====================

export async function getYearlyComparisonAllMonths(year: number, monthsBack: number = 12) {
  const db = await getDb();
  if (!db) return [];
  
  const monthsData: Array<{
    month: string;
    monthNumber: number;
    currentYear: number;
    previousYear: number;
  }> = [];
  
  // Get data for all 12 months
  for (let month = 1; month <= monthsBack; month++) {
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59).getTime();
    const prevStartDate = new Date(year - 1, month - 1, 1).getTime();
    const prevEndDate = new Date(year - 1, month, 0, 23, 59, 59).getTime();
    
    // Current year consumption
    const [currentResult] = await db.select({
      totalQuantity: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
    })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .where(and(
        gte(stockMovements.movementDate, startDate),
        lte(stockMovements.movementDate, endDate),
        eq(stockMovements.type, "saida")
      ));
    
    // Previous year consumption
    const [previousResult] = await db.select({
      totalQuantity: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
    })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .where(and(
        gte(stockMovements.movementDate, prevStartDate),
        lte(stockMovements.movementDate, prevEndDate),
        eq(stockMovements.type, "saida")
      ));
    
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    monthsData.push({
      month: monthNames[month - 1],
      monthNumber: month,
      currentYear: currentResult?.totalQuantity || 0,
      previousYear: previousResult?.totalQuantity || 0,
    });
  }
  
  return monthsData;
}


// ==================== RECEIVE ORDER ITEMS ====================

export async function receiveOrderItems(orderId: number, itemIds: number[], userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, orderId))
    .then(r => r[0]);

  if (!order) throw new Error("Order not found");

  // Get order items
  const items = await db
    .select({
      item: purchaseOrderItems,
      supply: supplies,
    })
    .from(purchaseOrderItems)
    .innerJoin(supplies, eq(purchaseOrderItems.supplyId, supplies.id))
    .where(eq(purchaseOrderItems.orderId, orderId));

  // Create stock movements for received items
  for (const { item, supply } of items) {
    if (itemIds.includes(item.id)) {
      await createStockMovement({
        supplyId: item.supplyId,
        type: "entrada",
        quantity: item.quantity,
        movementDate: Date.now(),
        notes: `Recebido do pedido #${orderId}`,
        userId,
      });

      // Mark item as received
      await db
        .update(purchaseOrderItems)
        .set({ received: true })
        .where(eq(purchaseOrderItems.id, item.id));
    }
  }

  // Check if all items are received
  const allItems = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.orderId, orderId));

  const allReceived = allItems.every(i => i.received);

  if (allReceived) {
    await db
      .update(purchaseOrders)
      .set({
        status: "entregue",
        actualDelivery: Date.now(),
      })
      .where(eq(purchaseOrders.id, orderId));
  }

  return { success: true, allReceived };
}

export async function getOrderItemsForInspection(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      item: purchaseOrderItems,
      supply: supplies,
      printer: printers,
    })
    .from(purchaseOrderItems)
    .innerJoin(supplies, eq(purchaseOrderItems.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(eq(purchaseOrderItems.orderId, orderId));
}


// ==================== ORDER CONFIRMATIONS ====================

export async function createOrderConfirmation(data: {
  orderId: number;
  userId: number;
  itemIds: number[];
  withEntry: boolean;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(orderConfirmations).values({
    orderId: data.orderId,
    userId: data.userId,
    confirmedAt: Date.now(),
    withEntry: data.withEntry ? true : false,
    itemIds: JSON.stringify(data.itemIds),
    notes: data.notes || null,
  });

  return { id: (result as any)[0].insertId };
}

export async function getOrderConfirmations(orderId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      confirmation: orderConfirmations,
      userName: users.name,
    })
    .from(orderConfirmations)
    .leftJoin(users, eq(orderConfirmations.userId, users.id))
    .where(eq(orderConfirmations.orderId, orderId))
    .orderBy(desc(orderConfirmations.confirmedAt));
}

export async function getAllConfirmations(filters?: {
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return { confirmations: [], total: 0 };

  const whereConditions = [];
  if (filters?.startDate) {
    whereConditions.push(gte(orderConfirmations.confirmedAt, filters.startDate));
  }
  if (filters?.endDate) {
    whereConditions.push(lte(orderConfirmations.confirmedAt, filters.endDate));
  }
  if (filters?.userId) {
    whereConditions.push(eq(orderConfirmations.userId, filters.userId));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const total = await db
    .select({ count: sql`COUNT(*)` })
    .from(orderConfirmations)
    .where(whereClause)
    .then(r => Number((r[0] as any).count));

  const confirmations = await db
    .select({
      confirmation: orderConfirmations,
      userName: users.name,
      orderNumber: purchaseOrders.orderNumber,
      supplier: purchaseOrders.supplier,
    })
    .from(orderConfirmations)
    .leftJoin(users, eq(orderConfirmations.userId, users.id))
    .leftJoin(purchaseOrders, eq(orderConfirmations.orderId, purchaseOrders.id))
    .where(whereClause)
    .orderBy(desc(orderConfirmations.confirmedAt))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);

  return { confirmations, total };
}

// ==================== YEARLY COMPARISON BY TYPE AND PRINTER ====================

export async function getYearlyComparisonByTypeAndPrinter(year: number, monthsBack: number = 12) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: Record<string, any[]> = {
    paperP5000: [],
    paperPlotter: [],
    cartridgesP5000: [],
    cartridgesPlotter: [],
  };

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (let month = 1; month <= monthsBack; month++) {
    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).getTime();
    const startOfMonthPrev = new Date(year - 1, month - 1, 1).getTime();
    const endOfMonthPrev = new Date(year - 1, month, 0, 23, 59, 59).getTime();

    // Paper P5000
    const paperP5000Current = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "papel"),
          sql`${printers.name} LIKE '%P5000%'`,
          gte(stockMovements.movementDate, startOfMonth),
          lte(stockMovements.movementDate, endOfMonth)
        )
      )
      .then(r => r[0]);

    const paperP5000Previous = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "papel"),
          sql`${printers.name} LIKE '%P5000%'`,
          gte(stockMovements.movementDate, startOfMonthPrev),
          lte(stockMovements.movementDate, endOfMonthPrev)
        )
      )
      .then(r => r[0]);

    // Paper PLOTTER
    const paperPlotterCurrent = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "papel"),
          sql`${printers.name} LIKE '%PLOTTER%'`,
          gte(stockMovements.movementDate, startOfMonth),
          lte(stockMovements.movementDate, endOfMonth)
        )
      )
      .then(r => r[0]);

    const paperPlotterPrevious = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "papel"),
          sql`${printers.name} LIKE '%PLOTTER%'`,
          gte(stockMovements.movementDate, startOfMonthPrev),
          lte(stockMovements.movementDate, endOfMonthPrev)
        )
      )
      .then(r => r[0]);

    // Cartridges P5000
    const cartridgesP5000Current = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "cartucho"),
          sql`${printers.name} LIKE '%P5000%'`,
          gte(stockMovements.movementDate, startOfMonth),
          lte(stockMovements.movementDate, endOfMonth)
        )
      )
      .then(r => r[0]);

    const cartridgesP5000Previous = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "cartucho"),
          sql`${printers.name} LIKE '%P5000%'`,
          gte(stockMovements.movementDate, startOfMonthPrev),
          lte(stockMovements.movementDate, endOfMonthPrev)
        )
      )
      .then(r => r[0]);

    // Cartridges PLOTTER
    const cartridgesPlotterCurrent = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "cartucho"),
          sql`${printers.name} LIKE '%PLOTTER%'`,
          gte(stockMovements.movementDate, startOfMonth),
          lte(stockMovements.movementDate, endOfMonth)
        )
      )
      .then(r => r[0]);

    const cartridgesPlotterPrevious = await db
      .select({ totalQuantity: sql`SUM(${stockMovements.quantity})` })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          eq(stockMovements.type, "saida"),
          eq(supplies.type, "cartucho"),
          sql`${printers.name} LIKE '%PLOTTER%'`,
          gte(stockMovements.movementDate, startOfMonthPrev),
          lte(stockMovements.movementDate, endOfMonthPrev)
        )
      )
      .then(r => r[0]);

    result.paperP5000.push({
      month: monthNames[month - 1],
      monthNumber: month,
      currentYear: paperP5000Current?.totalQuantity || 0,
      previousYear: paperP5000Previous?.totalQuantity || 0,
    });

    result.paperPlotter.push({
      month: monthNames[month - 1],
      monthNumber: month,
      currentYear: paperPlotterCurrent?.totalQuantity || 0,
      previousYear: paperPlotterPrevious?.totalQuantity || 0,
    });

    result.cartridgesP5000.push({
      month: monthNames[month - 1],
      monthNumber: month,
      currentYear: cartridgesP5000Current?.totalQuantity || 0,
      previousYear: cartridgesP5000Previous?.totalQuantity || 0,
    });

    result.cartridgesPlotter.push({
      month: monthNames[month - 1],
      monthNumber: month,
      currentYear: cartridgesPlotterCurrent?.totalQuantity || 0,
      previousYear: cartridgesPlotterPrevious?.totalQuantity || 0,
    });
  }

  return result;
}


// ==================== PERMISSIONS ====================

export async function initializePermissions() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot initialize permissions: database not available");
    return;
  }
  // Create default modules
  const modules = [
    { name: "printers", displayName: "Impressoras", description: "Gerenciar impressoras" },
    { name: "supplies", displayName: "Insumos", description: "Gerenciar insumos" },
    { name: "entrada", displayName: "Entrada", description: "Registrar entrada de insumos" },
    { name: "saida", displayName: "Saída", description: "Registrar saída de insumos" },
    { name: "pedidos", displayName: "Pedidos", description: "Gerenciar pedidos" },
    { name: "consultas", displayName: "Consultas", description: "Consultar dados" },
    { name: "relatorios", displayName: "Relatórios", description: "Gerar relatórios" },
    { name: "historico", displayName: "Histórico", description: "Visualizar histórico" },
    { name: "usuarios", displayName: "Usuários", description: "Gerenciar usuários" },
    { name: "config_emails", displayName: "Configuração de E-mails", description: "Configurar e-mails" },
    { name: "conferencia", displayName: "Conferência", description: "Conferir pedidos recebidos" },
    { name: "despacho_chic", displayName: "Despacho para CHIC", description: "Gerenciar despachos para CHIC" },
  ];

  for (const module of modules) {
    await db
      .insert(permissionModules)
      .values(module)
      .onConflictDoUpdate({
        target: permissionModules.name,
        set: { displayName: module.displayName },
      });
  }

  // Create default actions
  const actions = [
    { name: "view", displayName: "Visualizar" },
    { name: "create", displayName: "Cadastrar" },
    { name: "edit", displayName: "Editar" },
    { name: "delete", displayName: "Deletar" },
    { name: "report", displayName: "Gerar Relatório" },
  ];
  
  // Conference-specific actions
  const conferenceActions = [
    { name: "view", displayName: "Visualizar" },
    { name: "conferir", displayName: "Realizar Conferência" },
    { name: "dar_entrada", displayName: "Dar Entrada no Pedido" },
    { name: "conferir_e_dar_entrada", displayName: "Conferir e Dar Entrada" },
    { name: "report", displayName: "Gerar Relatório" },
  ];

  // Get all modules
  const allModules = await db.select().from(permissionModules);

  for (const module of allModules) {
    // Use conference-specific actions for conference module
    const moduleActions = module.name === 'conferencia' ? conferenceActions : actions;
    
    for (const action of moduleActions) {
      await db
        .insert(permissionActions)
        .values({
          moduleId: module.id,
          name: action.name,
          displayName: action.displayName,
        })
        .onConflictDoNothing();
    }
  }

  // Create default roles
  const adminRole = await db
    .insert(roles)
    .values({
      name: "admin",
      displayName: "Administrador",
      description: "Acesso total ao sistema",
      isSystem: true,
    })
    .onConflictDoUpdate({
      target: roles.name,
      set: { displayName: "Administrador" },
    });

  const operadorRole = await db
    .insert(roles)
    .values({
      name: "operador",
      displayName: "Operador",
      description: "Acesso limitado a operações básicas",
      isSystem: true,
    })
    .onConflictDoUpdate({
      target: roles.name,
      set: { displayName: "Operador" },
    });

  // Grant all permissions to admin
  const allActions = await db.select().from(permissionActions);
  const adminRoleRecord = await db.select().from(roles).where(eq(roles.name, 'admin')).limit(1);
  const adminRoleId = adminRoleRecord?.[0]?.id || 1;
  
  for (const action of allActions) {
    await db
      .insert(rolePermissions)
      .values({
        roleId: adminRoleId,
        moduleId: action.moduleId,
        actionId: action.id,
      })
      .onConflictDoNothing();
  }
}

export async function approveEntryForInspection(inspectionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  return db
    .update(orderInspections)
    .set({
      hasEntryApproval: true,
      entryApprovedAt: Date.now(),
      entryApprovedBy: userId,
    })
    .where(eq(orderInspections.id, inspectionId));
}

export async function getUserPermissions(userId: number) {
  const db = await getDb();
  if (!db) return { permissions: [] };

  // Get all permission modules and actions
  const modules = await db.select().from(permissionModules);
  const actions = await db.select().from(permissionActions);

  // Get user's role
  const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const userRole = userResult?.[0]?.role || 'user';

  // Get role permissions
  const rolePerms = await db
    .select()
    .from(rolePermissions)
    .innerJoin(permissionActions, eq(rolePermissions.actionId, permissionActions.id))
    .innerJoin(permissionModules, eq(rolePermissions.moduleId, permissionModules.id))
    .where(eq(rolePermissions.roleId, userRole === 'admin' ? 1 : 2)) as any;

  // Get user's specific overrides
  const userPerms = await db
    .select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId)) as any;

  // Build permission matrix
  const permissions: any[] = [];
  for (const module of modules) {
    // Filter actions that belong to this module
    const moduleActions = actions.filter((a: any) => a.moduleId === module.id);
    for (const action of moduleActions) {
      // Check if user has override
      const userPerm = userPerms.find(
        (p: any) => p.moduleId === module.id && p.actionId === action.id
      );
      
      // Check if role has this permission
      const rolePerm = rolePerms.find(
        (p: any) => p.permission_modules.id === module.id && p.permission_actions.id === action.id
      );

      // User override takes precedence
      const granted = userPerm ? userPerm.granted === 1 : (rolePerm ? true : false);

      permissions.push({
        moduleId: module.id,
        moduleName: module.name,
        actionId: action.id,
        actionName: action.name,
        granted,
      });
    }
  }

  return { permissions };
}

export async function updateUserPermissions(
  userId: number,
  moduleId: number,
  actionId: number,
  granted: boolean
) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.moduleId, moduleId),
        eq(userPermissions.actionId, actionId)
      )
    );

  if (existing.length > 0) {
    await db
      .update(userPermissions)
      .set({ granted: granted ? true : false })
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.moduleId, moduleId),
          eq(userPermissions.actionId, actionId)
        )
      );
  } else {
    try {
      await db.insert(userPermissions).values({
        userId: userId,
        moduleId: moduleId,
        actionId: actionId,
        granted: granted ? true : false,
      });
    } catch (err) {
      console.error('Erro ao inserir permissão:', err, { userId, moduleId, actionId, granted });
      throw err;
    }
  }
}

export async function hasPermission(
  userId: number,
  moduleId: number,
  actionId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // Check user-specific override first
  const userPerm = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.moduleId, moduleId),
        eq(userPermissions.actionId, actionId)
      )
    );

  if (userPerm.length > 0) {
    return userPerm[0].granted === true;
  }

  // Fall back to role permissions
  const rolePerm = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.moduleId, moduleId),
        eq(rolePermissions.actionId, actionId)
      )
    );

  return rolePerm.length > 0;
}


// ==================== AUDIT LOGS ====================

export async function logAudit(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Database not available, cannot log action");
    return;
  }
  try {
    await db.insert(auditLogs).values(data);
  } catch (error) {
    console.error("[Audit] Failed to log action:", error);
  }
}

export async function getAuditLogs(filters?: {
  userId?: number;
  module?: string;
  action?: string;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.module) {
    conditions.push(eq(auditLogs.module, filters.module));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  let query: any = db.select().from(auditLogs);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  query = query.orderBy(desc(auditLogs.timestamp));
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.offset(filters.offset);
  }

  return await query;
}

export async function getAuditLogCount(filters?: {
  userId?: number;
  module?: string;
  action?: string;
  startDate?: number;
  endDate?: number;
}) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [];

  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.module) {
    conditions.push(eq(auditLogs.module, filters.module));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action as any));
  }
  if (filters?.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  let query: any = db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const result = await query;
  return result[0]?.count ?? 0;
}

// ==================== PASSWORD AUTH ====================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get user by email:", error);
    return null;
  }
}

export async function createUserWithPassword(data: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "user" | "admin";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.insert(users).values({
      openId: `local-${data.email}-${Date.now()}`,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      loginMethod: "password",
      role: data.role || "user",
    });
    return (result as any).insertId || 0;
  } catch (error) {
    console.error("[Database] Failed to create user with password:", error);
    throw error;
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  } catch (error) {
    console.error("[Database] Failed to update user password:", error);
    throw error;
  }
}

export async function createAdminUser() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Verificar se já existe admin
    const existingAdmin = await db.select().from(users).where(eq(users.role, "admin"));
    if (existingAdmin.length > 0) {
      console.log("[Database] Admin user already exists");
      return;
    }
    
    // Criar admin com senha padrão
    
    const defaultPassword = "Laser@333#";
    const passwordHash = createHash("sha256").update(defaultPassword).digest("hex");
    
    await db.insert(users).values({
      openId: "admin-default",
      email: "sa@gmailstudio.com",
      name: "Administrador",
      passwordHash,
      loginMethod: "password",
      role: "admin",
      isApproved: true,
    });
    
    console.log("[Database] Admin user created");
  } catch (error) {
    console.error("[Database] Failed to create admin user:", error);
  }
}


// ==================== PASSWORD RESET ====================

export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas
  
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(
      eq(passwordResetTokens.token, token),
      gte(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt)
    ))
    .limit(1);
  
  return record?.userId ?? null;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const userId = await verifyPasswordResetToken(token);
  if (!userId) return false;
  
  
  const passwordHash = createHash("sha256").update(newPassword).digest("hex");
  
  await db.update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
  
  await db.update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
  
  return true;
}

// ==================== RATE LIMITING ====================

export async function recordLoginAttempt(email: string, ipAddress: string, success: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(loginAttempts).values({
    email,
    ipAddress,
    success: success ? true : false,
  });
}

export async function getLoginAttempts(email: string, ipAddress: string, minutesBack: number = 15): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
  
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(and(
      eq(loginAttempts.email, email),
      eq(loginAttempts.ipAddress, ipAddress),
      eq(loginAttempts.success, false),
      gte(loginAttempts.createdAt, cutoffTime)
    ));
  
  return result?.count ?? 0;
}

export async function isLoginRateLimited(email: string, ipAddress: string, maxAttempts: number = 5): Promise<boolean> {
  const attempts = await getLoginAttempts(email, ipAddress);
  return attempts >= maxAttempts;
}


// ==================== EMAIL VERIFICATION ====================

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  
  await db.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });
  
  return token;
}

export async function verifyEmailToken(token: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const result = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);
    
    if (!result.length) return null;
    
    const record = result[0] as any;
    
    // Verificar se não expirou
    if (new Date(record.expiresAt) < new Date()) {
      return null;
    }
    
    // Verificar se já foi verificado
    if (record.verifiedAt) {
      return null;
    }
    
    // Marcar como verificado
    await db.update(emailVerificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationTokens.token, token));
    
    return record.userId;
  } catch (error) {
    console.error("[Database] Error verifying email token:", error);
    return null;
  }
}

export async function hasVerifiedEmail(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const result = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId))
      .limit(1);
    
    if (!result.length) return false;
    const record = result[0] as any;
    return record.verifiedAt !== null;
  } catch (error) {
    console.error("[Database] Error checking email verification:", error);
    return false;
  }
}


// ==================== USER APPROVAL ====================

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const result = await db.select().from(users)
      .where(eq(users.isApproved, false))
      .orderBy(desc(users.createdAt));
    
    return result;
  } catch (error) {
    console.error("[Database] Error getting pending users:", error);
    return [];
  }
}

export async function approveUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.update(users)
      .set({ isApproved: true })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error("[Database] Error approving user:", error);
    return false;
  }
}

export async function rejectUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Error rejecting user:", error);
    return false;
  }
}



export async function deleteUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Error deleting user:", error);
    return false;
  }
}


// ==================== PERMISSIONS ====================

export type PermissionModuleName = 'printers' | 'supplies' | 'entrada' | 'saida' | 'pedidos' | 'consultas' | 'relatorios' | 'historico' | 'usuarios' | 'config_emails' | 'conferencia' | 'despacho_chic';
export type PermissionActionName = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionInput {
  moduleName: PermissionModuleName;
  actionName: PermissionActionName;
  granted: boolean;
}

export interface UserPermissionsMap {
  [module: string]: {
    [action: string]: boolean;
  };
}

export async function checkUserPermission(
  userId: number,
  moduleName: PermissionModuleName,
  actionName: PermissionActionName
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Admins têm todas as permissões
    const user = await getUserById(userId);
    if (user?.role === 'admin') return true;

    // Buscar IDs do módulo e ação
    const moduleResult = await db.select().from(permissionModules)
      .where(eq(permissionModules.name, moduleName)).limit(1);
    const actionResult = await db.select().from(permissionActions)
      .where(eq(permissionActions.name, actionName)).limit(1);

    if (!moduleResult.length || !actionResult.length) return false;

    const moduleId = (moduleResult[0] as any).id;
    const actionId = (actionResult[0] as any).id;

    // Verificar permissões do usuário
    const result = await db.select({
      id: userPermissions.id,
      userId: userPermissions.userId,
      moduleId: userPermissions.moduleId,
      actionId: userPermissions.actionId,
      granted: userPermissions.granted,
    })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.moduleId, moduleId),
          eq(userPermissions.actionId, actionId)
        )
      )
      .limit(1);

    if (result.length > 0) {
      const perm = result[0] as any;
      return perm.granted === 1;
    }

    // Se não houver permissão específica, verificar role_permissions
    // role_permissions sempre concede a permissão (não tem campo granted)
    const roleResult = await db.select({
      id: rolePermissions.id,
      roleId: rolePermissions.roleId,
      moduleId: rolePermissions.moduleId,
      actionId: rolePermissions.actionId,
    })
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.moduleId, moduleId),
          eq(rolePermissions.actionId, actionId)
        )
      )
      .limit(1);

    if (roleResult.length > 0) {
      // Se encontrou na role_permissions, a permissão é concedida
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Database] Error checking permission:", error);
    return false;
  }
}

export async function getUserPermissionsMap(userId: number): Promise<UserPermissionsMap> {
  const db = await getDb();
  if (!db) return {};

  try {
    const modules: PermissionModuleName[] = ['printers', 'supplies', 'entrada', 'saida', 'pedidos', 'consultas', 'relatorios', 'historico', 'usuarios', 'config_emails', 'conferencia'];
    const actions: PermissionActionName[] = ['view', 'create', 'edit', 'delete'];
    
    const permissionsMap: UserPermissionsMap = {};

    for (const module of modules) {
      permissionsMap[module] = {};
      for (const action of actions) {
        const hasPermission = await checkUserPermission(userId, module, action);
        permissionsMap[module][action] = hasPermission;
      }
    }

    return permissionsMap;
  } catch (error) {
    console.error("[Database] Error getting permissions map:", error);
    return {};
  }
}

export async function assignUserPermissions(
  userId: number,
  permissions: PermissionInput[]
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Deletar permissões antigas
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    // Inserir novas permissões
    if (permissions.length > 0) {
      for (const perm of permissions) {
        const moduleResult = await db.select().from(permissionModules)
          .where(eq(permissionModules.name, perm.moduleName)).limit(1);
        const actionResult = await db.select().from(permissionActions)
          .where(eq(permissionActions.name, perm.actionName)).limit(1);

        if (moduleResult.length && actionResult.length) {
          const moduleId = (moduleResult[0] as any).id;
          const actionId = (actionResult[0] as any).id;

          await db.insert(userPermissions).values({
            userId,
            moduleId,
            actionId,
            granted: perm.granted ? true : false,
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error("[Database] Error assigning permissions:", error);
    return false;
  }
}

export async function initializeDefaultPermissions(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Verificar se já existem permissões
    const existing = await db.select().from(permissionModules).limit(1);
    if (existing.length > 0) return;

    // Criar módulos
    const modules: Array<{name: PermissionModuleName, displayName: string}> = [
      { name: 'printers', displayName: 'Impressoras' },
      { name: 'supplies', displayName: 'Insumos' },
      { name: 'entrada', displayName: 'Entrada' },
      { name: 'saida', displayName: 'Saída' },
      { name: 'pedidos', displayName: 'Pedidos' },
      { name: 'consultas', displayName: 'Consultas' },
      { name: 'relatorios', displayName: 'Relatórios' },
      { name: 'historico', displayName: 'Histórico' },
      { name: 'usuarios', displayName: 'Usuários' },
      { name: 'config_emails', displayName: 'Configuração de E-mails' },
      { name: 'conferencia', displayName: 'Conferência' },
    ];
    
    for (const module of modules) {
      await db.insert(permissionModules).values({
        name: module.name,
        displayName: module.displayName,
        description: `${module.displayName} module`,
      });
    }

    // Criar ações para cada módulo
    const actions: Array<{name: PermissionActionName, displayName: string}> = [
      { name: 'view', displayName: 'Visualizar' },
      { name: 'create', displayName: 'Criar' },
      { name: 'edit', displayName: 'Editar' },
      { name: 'delete', displayName: 'Deletar' },
    ];
    
    // Buscar todos os módulos criados
    const allModules = await db.select().from(permissionModules);
    
    for (const module of allModules) {
      for (const action of actions) {
        await db.insert(permissionActions).values({
          moduleId: (module as any).id,
          name: action.name,
          displayName: action.displayName,
          description: `${action.displayName} action`,
        });
      }
    }

    console.log("[Database] Default permissions initialized");
  } catch (error) {
    console.error("[Database] Error initializing default permissions:", error);
  }
}


// ==================== PERMISSION TEMPLATES ====================

export async function getPermissionTemplates() {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(permissionTemplates).where(eq(permissionTemplates.isActive, true));
  } catch (error) {
    console.error("[Database] Failed to get permission templates:", error);
    return [];
  }
}

export async function getTemplatePermissions(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(templatePermissions).where(eq(templatePermissions.templateId, templateId));
  } catch (error) {
    console.error("[Database] Failed to get template permissions:", error);
    return [];
  }
}

export async function applyTemplateToUser(userId: number, templateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get all permissions from the template
    const templatePerms = await db.select().from(templatePermissions).where(eq(templatePermissions.templateId, templateId));
    
    // Delete existing user permissions
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
    
    // Insert new permissions from template
    for (const perm of templatePerms) {
      // Get the action to find its moduleId
      const action = await db.select().from(permissionActions).where(eq(permissionActions.id, perm.actionId)).limit(1);
      if (action.length > 0) {
        await db.insert(userPermissions).values({
          userId,
          moduleId: action[0].moduleId,
          actionId: perm.actionId,
          granted: true,
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to apply template to user:", error);
    throw error;
  }
}

export async function initializeDefaultTemplates() {
  const db = await getDb();
  if (!db) return;
  
  try {
    // Check if templates already exist
    const existing = await db.select().from(permissionTemplates).limit(1);
    if (existing.length > 0) return;
    
    // Get all permission actions
    const allActions = await db.select().from(permissionActions);
    
    // Create Visualizador template (view only)
    const visualizadorResult = await db.insert(permissionTemplates).values({
      name: "Visualizador",
      description: "Acesso apenas para visualizar dados. Sem permissão para criar, editar ou deletar.",
      isActive: true,
    });
    const visualizadorId = (visualizadorResult as any).insertId || 1;
    
    // Add view permissions for all modules
    const viewActions = allActions.filter(a => a.name === "view");
    for (const action of viewActions) {
      await db.insert(templatePermissions).values({
        templateId: visualizadorId,
        actionId: action.id,
      });
    }
    
    // Create Operador template (view + create + edit)
    const operadorResult = await db.insert(permissionTemplates).values({
      name: "Operador",
      description: "Acesso para visualizar, criar e editar dados. Sem permissão para deletar.",
      isActive: true,
    });
    const operadorId = (operadorResult as any).insertId || 2;
    
    const operadorActions = allActions.filter(a => ["view", "create", "edit"].includes(a.name));
    for (const action of operadorActions) {
      await db.insert(templatePermissions).values({
        templateId: operadorId,
        actionId: action.id,
      });
    }
    
    // Create Gerente template (all permissions)
    const gerenteResult = await db.insert(permissionTemplates).values({
      name: "Gerente",
      description: "Acesso total para gerenciar dados, incluindo deleção.",
      isActive: true,
    });
    const gerenteId = (gerenteResult as any).insertId || 3;
    
    // Add all permissions for Gerente
    for (const action of allActions) {
      await db.insert(templatePermissions).values({
        templateId: gerenteId,
        actionId: action.id,
      });
    }
    
    console.log("[Database] Default permission templates initialized");
  } catch (error) {
    console.error("[Database] Failed to initialize default templates:", error);
  }
}


// ==================== DAILY AVERAGE CONSUMPTION ====================

export async function getDailyAverageConsumption(startDate?: number, endDate?: number, supplyType?: string) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Default to last 30 days if no dates provided
    const end = endDate || Date.now();
    const start = startDate || (Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Build where conditions
    const conditions: any[] = [
      gte(stockMovements.movementDate, start),
      lte(stockMovements.movementDate, end),
      eq(stockMovements.type, 'saida')
    ];
    
    if (supplyType) {
      conditions.push(sql`${supplies.type}::text = ${supplyType}`);
    }
    
    // Get all movements in the period with printer info
    const result = await db.select({
      quantity: stockMovements.quantity,
      printerName: printers.name,
    })
    .from(stockMovements)
    .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
    .innerJoin(printers, eq(supplies.printerId, printers.id))
    .where(and(...conditions));
    
    // Calculate days in period
    const daysInPeriod = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    
    // Group by printer and calculate average
    const printerMap: Record<string, number> = {};
    
    for (const mov of result) {
      printerMap[mov.printerName] = (printerMap[mov.printerName] || 0) + (mov.quantity || 0);
    }
    
    // Calculate daily average
    return Object.entries(printerMap).map(([name, total]) => ({
      name,
      total,
      dailyAverage: Math.round((total / daysInPeriod) * 100) / 100,
      daysInPeriod,
    })).sort((a, b) => b.dailyAverage - a.dailyAverage);
  } catch (error) {
    console.error("[Database] Failed to get daily average consumption:", error);
    return [];
  }
}


// ==================== TIME TO CONSUME 1 BOX/ROLL ====================

export async function getTimeToConsume1Unit(startDate?: number, endDate?: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    // Default to last 90 days if no dates provided
    const end = endDate || Date.now();
    const start = startDate || (Date.now() - 90 * 24 * 60 * 60 * 1000);
    const daysInPeriod = Math.max(1, Math.floor((end - start) / (24 * 60 * 60 * 1000)));
    
    // Get all paper supplies (filter by name containing 'papel' or 'papel' in Portuguese)
    const paperSupplies = await db
      .select({
        id: supplies.id,
        name: supplies.name,
        printerId: supplies.printerId,
        printerName: printers.name,
      })
      .from(supplies)
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(sql`LOWER(${supplies.name}) LIKE '%papel%' OR LOWER(${supplies.name}) LIKE '%rolo%' OR LOWER(${supplies.name}) LIKE '%caixa%'`);
    
    // For each paper supply, calculate total consumption and time to consume 1 unit
    const results = [];
    
    for (const paper of paperSupplies) {
      const consumptionResult = await db
        .select({
          totalQuantity: sql<number>`SUM(${stockMovements.quantity})`,
        })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.supplyId, paper.id),
            eq(stockMovements.type, 'saida'),
            gte(stockMovements.createdAt, new Date(start)),
            lte(stockMovements.createdAt, new Date(end))
          )
        );
      
      const totalConsumption = consumptionResult[0]?.totalQuantity || 0;
      
      if (totalConsumption > 0) {
        // Calculate daily consumption
        const dailyConsumption = totalConsumption / daysInPeriod;
        // Calculate days to consume 1 unit (1 box or 1 roll)
        const daysToConsume1Unit = Math.round(1 / dailyConsumption);
        
        results.push({
          printerName: paper.printerName,
          supplyName: paper.name,
          totalConsumption,
          dailyConsumption: Math.round(dailyConsumption * 100) / 100,
          daysToConsume1Unit: daysToConsume1Unit > 0 ? daysToConsume1Unit : null,
        });
      }
    }
    
    return results.sort((a, b) => {
      if (a.printerName !== b.printerName) {
        return a.printerName.localeCompare(b.printerName);
      }
      return a.supplyName.localeCompare(b.supplyName);
    });
  } catch (error) {
    console.error("[Database] Failed to get time to consume 1 unit:", error);
    return [];
  }
}

// ==================== KPIs ====================

export async function calculateKPIs(startDate?: number, endDate?: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Calcular período (últimos 30 dias se não especificado)
    const end = endDate || Date.now();
    const start = startDate || (end - 30 * 24 * 60 * 60 * 1000);
    const daysInPeriod = Math.max(1, Math.floor((end - start) / (24 * 60 * 60 * 1000)));

    // 1. Consumo total no período
    const consumptionResult = await db
      .select({
        totalQuantity: sql<number>`SUM(CASE WHEN ${stockMovements.type} = 'saida' THEN ${stockMovements.quantity} ELSE 0 END)`,
        totalEntries: sql<number>`SUM(CASE WHEN ${stockMovements.type} = 'entrada' THEN ${stockMovements.quantity} ELSE 0 END)`,
      })
      .from(stockMovements)
      .where(
        and(
          gte(stockMovements.createdAt, new Date(start)),
          lte(stockMovements.createdAt, new Date(end))
        )
      );

    const totalConsumption = consumptionResult[0]?.totalQuantity || 0;
    const totalEntries = consumptionResult[0]?.totalEntries || 0;
    const monthlyAverage = Math.round((totalConsumption / daysInPeriod) * 30);

    // 2. Taxa de reposição (entradas vs saídas)
    const replenishmentRate = totalConsumption > 0 ? Math.round((totalEntries / totalConsumption) * 100) : 0;

    // 3. Eficiência de estoque (quantidade de itens com estoque baixo)
    const lowStockSupplies = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(supplies)
      .where(sql`${supplies.currentStock} <= ${supplies.minStock}`);

    const totalSupplies = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(supplies);

    const lowStockPercentage = totalSupplies[0]?.count > 0 
      ? Math.round((lowStockSupplies[0]?.count || 0 / totalSupplies[0]?.count) * 100)
      : 0;

    // 4. Consumo por impressora
    const consumptionByPrinter = await db
      .select({
        printerName: printers.name,
        totalConsumption: sql<number>`SUM(CASE WHEN ${stockMovements.type} = 'saida' THEN ${stockMovements.quantity} ELSE 0 END)`,
      })
      .from(stockMovements)
      .innerJoin(supplies, eq(stockMovements.supplyId, supplies.id))
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(
        and(
          gte(stockMovements.createdAt, new Date(start)),
          lte(stockMovements.createdAt, new Date(end))
        )
      )
      .groupBy(printers.id);

    // 5. Itens críticos (estoque = 0)
    const criticalItems = await db
      .select({
        name: supplies.name,
        printerName: printers.name,
        currentStock: supplies.currentStock,
      })
      .from(supplies)
      .innerJoin(printers, eq(supplies.printerId, printers.id))
      .where(eq(supplies.currentStock, 0));

    return {
      period: { start, end, daysInPeriod },
      totalConsumption,
      totalEntries,
      monthlyAverage,
      replenishmentRate,
      lowStockPercentage,
      consumptionByPrinter,
      criticalItems,
    };
  } catch (error) {
    console.error("[KPIs] Error calculating KPIs:", error);
    return null;
  }
}


// ==================== STOCK PREDICTION ====================

export async function predictStockCritical(supplyId: number, daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Buscar histórico de consumo dos últimos 90 dias
    const movements = await db
      .select({
        date: stockMovements.createdAt,
        quantity: stockMovements.quantity,
        type: stockMovements.type,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.supplyId, supplyId),
          eq(stockMovements.type, "saida"),
          gte(stockMovements.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(asc(stockMovements.createdAt));

    if (movements.length < 3) {
      return null; // Dados insuficientes para previsão
    }

    // Calcular consumo diário agregado
    const dailyConsumption: Record<string, number> = {};
    movements.forEach(m => {
      const dateKey = new Date(m.date).toISOString().split('T')[0];
      dailyConsumption[dateKey] = (dailyConsumption[dateKey] || 0) + m.quantity;
    });

    const dailyValues = Object.values(dailyConsumption);
    const avgDailyConsumption = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;

    // Regressão linear simples para encontrar tendência
    const n = dailyValues.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = dailyValues.reduce((a, b) => a + b, 0);
    const sumXY = dailyValues.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Previsão do consumo futuro
    const futureConsumption = intercept + slope * (n + daysAhead);
    const predictedDailyConsumption = Math.max(futureConsumption / daysAhead, 0);

    // Buscar estoque atual e mínimo
    const supply = await db
      .select({
        currentStock: supplies.currentStock,
        minStock: supplies.minStock,
      })
      .from(supplies)
      .where(eq(supplies.id, supplyId))
      .then(r => r[0]);

    if (!supply) return null;

    // Calcular dias até estoque crítico
    const stockAboveMin = supply.currentStock - supply.minStock;
    const daysUntilCritical = stockAboveMin > 0 
      ? Math.ceil(stockAboveMin / Math.max(predictedDailyConsumption, 0.1))
      : 0;

    return {
      supplyId,
      currentStock: supply.currentStock,
      minStock: supply.minStock,
      avgDailyConsumption: Number(avgDailyConsumption.toFixed(2)),
      predictedDailyConsumption: Number(predictedDailyConsumption.toFixed(2)),
      daysUntilCritical: Math.max(daysUntilCritical, 0),
      estimatedCriticalDate: new Date(Date.now() + daysUntilCritical * 24 * 60 * 60 * 1000).getTime(),
      confidence: Math.min(100, (n / 90) * 100), // Confiança baseada na quantidade de dados
    };
  } catch (error) {
    console.error("[Prediction] Error predicting stock:", error);
    return null;
  }
}

export async function predictAllStocksCritical(daysAhead: number = 30) {
  const db = await getDb();
  if (!db) return null;

  try {
    const allSupplies = await db.select({ id: supplies.id }).from(supplies);
    const predictions = await Promise.all(
      allSupplies.map(s => predictStockCritical(s.id, daysAhead))
    );

    return predictions
      .filter(p => p !== null)
      .sort((a, b) => (a?.daysUntilCritical || 999) - (b?.daysUntilCritical || 999));
  } catch (error) {
    console.error("[Prediction] Error predicting all stocks:", error);
    return null;
  }
}


// ==================== AUDIT LOGGING FOR MOVEMENTS ====================

export async function logMovementUpdate(
  userId: number,
  userName: string,
  movementId: number,
  previousData: any,
  newData: any
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLogs).values({
      userId,
      userName,
      action: "update",
      module: "movements",
      entityId: movementId,
      entityName: `Movimentação #${movementId}`,
      details: JSON.stringify({
        type: "movement_update",
        previous: {
          quantity: previousData.quantity,
          type: previousData.type,
          notes: previousData.notes,
          previousStock: previousData.previousStock,
          newStock: previousData.newStock,
        },
        new: {
          quantity: newData.quantity,
          type: newData.type,
          notes: newData.notes,
          previousStock: newData.previousStock,
          newStock: newData.newStock,
        },
      }),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Audit] Failed to log movement update:", error);
  }
}

export async function logMovementDelete(
  userId: number,
  userName: string,
  movementId: number,
  movementData: any
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLogs).values({
      userId,
      userName,
      action: "delete",
      module: "movements",
      entityId: movementId,
      entityName: `Movimentação #${movementId}`,
      details: JSON.stringify({
        type: "movement_delete",
        deleted: {
          quantity: movementData.quantity,
          type: movementData.type,
          notes: movementData.notes,
          previousStock: movementData.previousStock,
          newStock: movementData.newStock,
          supplyId: movementData.supplyId,
          movementDate: movementData.movementDate,
        },
      }),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Audit] Failed to log movement delete:", error);
  }
}

export async function getMovementAuditLogs(movementId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.module, "movements"),
          eq(auditLogs.entityId, movementId)
        )
      )
      .orderBy(desc(auditLogs.timestamp));
  } catch (error) {
    console.error("[Audit] Failed to get movement audit logs:", error);
    return [];
  }
}


// ==================== MOVEMENT EDIT NOTIFICATION ====================

export async function notifyMovementEdit(
  movementId: number,
  editedByUserId: number,
  editedByUserName: string,
  previousData: any,
  newData: any,
  adminEmails: string[]
) {
  try {
    const { sendEmailToMultiple } = await import('./sendgrid');
    
    // Format the notification email
    const previousDate = new Date(previousData.movementDate).toLocaleString('pt-BR');
    const newDate = new Date(newData.movementDate).toLocaleString('pt-BR');
    
    const html = `
      <h2>Notificação de Edição de Movimentação</h2>
      <p><strong>Usuário:</strong> ${editedByUserName}</p>
      <p><strong>Data/Hora da Edição:</strong> ${new Date().toLocaleString('pt-BR')}</p>
      
      <h3>Detalhes da Alteração:</h3>
      <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
        <tr style="background-color: #f0f0f0;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Campo</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valor Anterior</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Novo Valor</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Quantidade</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${previousData.quantity}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${newData.quantity}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Tipo</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${previousData.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${newData.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Data/Hora</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${previousDate}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${newDate}</td>
        </tr>
        ${previousData.notes !== newData.notes ? `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Observações</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${previousData.notes || '-'}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">${newData.notes || '-'}</td>
        </tr>
        ` : ''}
      </table>
      
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Esta é uma notificação automática do sistema de controle de estoque.
      </p>
    `;
    
    await sendEmailToMultiple(
      adminEmails,
      `[Estoque] Movimentação Editada - ID ${movementId}`,
      html
    );
    
    console.log(`[Notification] Edit notification sent to ${adminEmails.length} admins`);
    return true;
  } catch (error) {
    console.error('[Notification] Failed to send edit notification:', error);
    return false;
  }
}


export async function notifyMovementDelete(
  movementId: number,
  deletedByUserId: number,
  deletedByUserName: string,
  movementData: any,
  deletionReason: string,
  adminEmails: string[]
) {
  try {
    const { sendEmailToMultiple } = await import('./sendgrid');
    
    // Format the notification email
    const movementDate = new Date(movementData.movementDate).toLocaleString('pt-BR');
    const deletionTime = new Date().toLocaleString('pt-BR');
    
    const html = `
      <h2 style="color: #d32f2f;">Notificação de Deleção de Movimentação</h2>
      <p><strong>Usuário:</strong> ${deletedByUserName}</p>
      <p><strong>Data/Hora da Deleção:</strong> ${deletionTime}</p>
      
      <h3>Motivo da Deleção:</h3>
      <p style="background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0;">
        ${deletionReason || '<em>Sem motivo informado</em>'}
      </p>
      
      <h3>Dados da Movimentação Deletada:</h3>
      <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
        <tr style="background-color: #f0f0f0;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Campo</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Valor</th>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>ID Movimentação</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementId}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Tipo</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementData.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Quantidade</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementData.quantity}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Data/Hora Original</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementDate}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Estoque Anterior</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementData.previousStock}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Estoque Após</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementData.newStock}</td>
        </tr>
        ${movementData.notes ? `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;"><strong>Observações</strong></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${movementData.notes}</td>
        </tr>
        ` : ''}
      </table>
      
      <p style="margin-top: 20px; color: #d32f2f; font-weight: bold;">
        ⚠️ Atenção: Esta movimentação foi deletada e o estoque foi revertido.
      </p>
      
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Esta é uma notificação automática do sistema de controle de estoque.
      </p>
    `;
    
    await sendEmailToMultiple(
      adminEmails,
      `[Estoque] ⚠️ Movimentação Deletada - ID ${movementId}`,
      html
    );
    
    console.log(`[Notification] Delete notification sent to ${adminEmails.length} admins`);
    return true;
  } catch (error) {
    console.error('[Notification] Failed to send delete notification:', error);
    return false;
  }
}


// ==================== SUPPLY TRANSFERS ====================



// ==================== DISPATCHES (DESPACHO PARA CHIC) ====================

/**
 * Criar um despacho de insumo da Studiolaser para CHIC
 * Desconta do estoque da Studiolaser e adiciona no estoque da CHIC
 */
export async function createDispatch(data: {
  supplyId: number;
  quantity: number;
  notes?: string;
  dispatchedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // 1. Buscar o insumo
    const supply = await db.select().from(supplies).where(eq(supplies.id, data.supplyId)).limit(1);
    if (!supply.length) throw new Error('Insumo não encontrado');

    const currentSupply = supply[0];
    if (currentSupply.currentStock < data.quantity) {
      throw new Error(`Estoque insuficiente. Disponível: ${currentSupply.currentStock}, Solicitado: ${data.quantity}`);
    }

    // 2. Descontar do estoque da Studiolaser
    const newStock = currentSupply.currentStock - data.quantity;
    await db.update(supplies)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(supplies.id, data.supplyId));

    // 3. Registrar movimento de saída
    await db.insert(stockMovements).values({
      supplyId: data.supplyId,
      type: 'saida',
      quantity: data.quantity,
      previousStock: currentSupply.currentStock,
      newStock: newStock,
      notes: `Despacho para CHIC: ${data.notes || ''}`,
      userId: data.dispatchedBy,
      movementDate: Date.now(),
    });

    // 4. Criar registro de despacho usando SQL puro
    const result = await db.execute(sql`
      INSERT INTO dispatches ("supplyId", quantity, notes, "dispatchedBy", "dispatchDate", status, "createdAt", "updatedAt")
      VALUES (${data.supplyId}, ${data.quantity}, ${data.notes || null}, ${data.dispatchedBy}, ${Date.now()}, 'pendente', NOW(), NOW())
      RETURNING id
    `);

    return result.rows?.[0]?.id || 0;
  } catch (error) {
    console.error('Erro ao criar despacho:', error);
    throw error;
  }
}

/**
 * Listar despachos com filtros
 */
export async function getDispatches(filters?: {
  supplyId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    // Usar SQL puro para consulta
    const statusFilter = filters?.status ? `AND d.status = '${filters.status}'` : '';
    const result = await db.execute(sql`
      SELECT d.*, s.name, s.color, s."colorHex"
      FROM dispatches d
      JOIN supplies s ON d."supplyId" = s.id
      WHERE 1=1 ${sql.raw(statusFilter)}
      ORDER BY d."dispatchDate" DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Erro ao listar despachos:', error);
    throw error;
  }
}

/**
 * Confirmar despacho (mudar status para confirmado)
 */
export async function confirmDispatch(dispatchId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    await db.execute(sql`
      UPDATE dispatches
      SET status = 'confirmado', "updatedAt" = NOW()
      WHERE id = ${dispatchId}
    `);

    return { success: true };
  } catch (error) {
    console.error('Erro ao confirmar despacho:', error);
    throw error;
  }
}

/**
 * Obter todos os insumos da EPSON P5000 com estoque disponível
 */
export async function getEpsonP5000Supplies() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Buscar a impressora EPSON P5000
    const epsonPrinter = await db
      .select()
      .from(printers)
      .where(and(like(printers.name, '%P5000%'), eq(printers.isActive, true)))
      .limit(1);

    if (!epsonPrinter || epsonPrinter.length === 0) {
      return [];
    }

    const printerId = epsonPrinter[0].id;

    // Buscar todos os insumos da EPSON P5000
    const supplies_list = await db
      .select()
      .from(supplies)
      .where(and(eq(supplies.printerId, printerId), eq(supplies.isActive, true)))
      .orderBy(asc(supplies.name));

    return supplies_list;
  } catch (error) {
    console.error('Erro ao obter insumos da EPSON P5000:', error);
    throw error;
  }
}

/**
 * Obter resumo de estoque da CHIC para cada insumo
 */
export async function getChicStockSummary() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Buscar a impressora EPSON P5000
    const epsonPrinter = await db
      .select()
      .from(printers)
      .where(eq(printers.name, 'EPSON P5000'))
      .limit(1);

    if (!epsonPrinter || epsonPrinter.length === 0) {
      return [];
    }

    // Buscar apenas insumos da EPSON P5000
    const supplies_list = await db.select().from(supplies).where(
      and(
        eq(supplies.printerId, epsonPrinter[0].id),
        eq(supplies.isActive, true)
      )
    );

    // Para cada insumo, calcular quantos foram despachados para CHIC e subtrair consumos
    const summary = await Promise.all(supplies_list.map(async (supply) => {
      // Buscar despachos confirmados para este insumo
      const dispatched = await db.execute(sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM dispatches
        WHERE "supplyId" = ${supply.id} AND status = 'confirmado'
      `);

      const dispatchedTotal = (dispatched.rows?.[0]?.total || 0) as number;

      // Buscar consumos registrados para este insumo
      const consumed = await db.execute(sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM chic_consumptions
        WHERE "supplyId" = ${supply.id}
      `);

      const consumedTotal = (consumed.rows?.[0]?.total || 0) as number;

      // Estoque CHIC = despachos confirmados - consumo registrado
      const chicStock = Math.max(0, dispatchedTotal - consumedTotal);

      return {
        ...supply,
        chicStock: chicStock,
        studiolaserStock: supply.currentStock,
      };
    }));

    return summary;
  } catch (error) {
    console.error('Erro ao obter resumo de estoque CHIC:', error);
    throw error;
  }
}


/**
 * Obter todos os insumos da EPSON P5000 com estoque disponível na CHIC
 */
export async function getChicSupplies() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Buscar a impressora EPSON P5000
    const epsonPrinter = await db
      .select()
      .from(printers)
      .where(and(like(printers.name, '%P5000%'), eq(printers.isActive, true)))
      .limit(1);

    if (!epsonPrinter || epsonPrinter.length === 0) {
      return [];
    }

    const printerId = epsonPrinter[0].id;

    // Buscar todos os insumos da EPSON P5000
    const supplies_list = await db
      .select()
      .from(supplies)
      .where(and(eq(supplies.printerId, printerId), eq(supplies.isActive, true)))
      .orderBy(asc(supplies.name));

    // Para cada insumo, calcular o estoque na CHIC
    const chicSupplies = await Promise.all(supplies_list.map(async (supply) => {
      // Buscar despachos confirmados para este insumo
      const dispatched = await db.execute(sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM dispatches
        WHERE "supplyId" = ${supply.id} AND status = 'confirmado'
      `);

      // Buscar consumo da CHIC para este insumo
      const consumed = await db.execute(sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM chic_consumptions
        WHERE "supplyId" = ${supply.id}
      `);

      const dispatchedQty = (dispatched.rows?.[0]?.total || 0) as number;
      const consumedQty = (consumed.rows?.[0]?.total || 0) as number;
      const chicStock = dispatchedQty - consumedQty;

      return {
        ...supply,
        chicStock: Math.max(0, chicStock), // Não permitir estoque negativo
      };
    }));

    return chicSupplies;
  } catch (error) {
    console.error('Erro ao obter insumos da CHIC:', error);
    throw error;
  }
}


// ==================== CHIC CONSUMPTIONS ====================

export async function registerChicConsumption(data: Omit<InsertChicConsumption, 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    const result = await db.insert(chicConsumptions).values({
      ...data,
    }).returning({ id: chicConsumptions.id });

    return result[0]?.id || 0;
  } catch (error) {
    console.error('Erro ao registrar consumo da CHIC:', error);
    throw error;
  }
}


// ==================== MOVEMENT HISTORY ====================

export async function getMovementHistoryByDateRange(startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Buscar a impressora EPSON P5000
    const epsonPrinter = await db
      .select()
      .from(printers)
      .where(and(like(printers.name, '%P5000%'), eq(printers.isActive, true)))
      .limit(1);

    if (!epsonPrinter || epsonPrinter.length === 0) {
      return [];
    }

    const printerId = epsonPrinter[0].id;

    // Buscar todos os insumos da EPSON P5000
    const supplies_list = await db
      .select()
      .from(supplies)
      .where(and(eq(supplies.printerId, printerId), eq(supplies.isActive, true)))
      .orderBy(asc(supplies.name));

    // Para cada insumo, buscar despachos e consumos filtrados por data
    const history = await Promise.all(supplies_list.map(async (supply) => {
      let dispatchQuery = `
        SELECT 
          d.id,
          d.quantity,
          d."dispatchDate",
          d.status,
          d.notes,
          u.name as "dispatchedBy"
        FROM dispatches d
        LEFT JOIN users u ON d."dispatchedBy" = u.id
        WHERE d."supplyId" = ${supply.id}
      `;

      let consumptionQuery = `
        SELECT 
          c.id,
          c.quantity,
          c."consumptionDate",
          c.notes,
          u.name as "recordedBy"
        FROM chic_consumptions c
        LEFT JOIN users u ON c."recordedBy" = u.id
        WHERE c."supplyId" = ${supply.id}
      `;

      // Adicionar filtros de data se fornecidos
      if (startDate) {
        const startTime = startDate.getTime();
        dispatchQuery += ` AND d."dispatchDate" >= ${startTime}`;
        consumptionQuery += ` AND c."consumptionDate" >= ${startTime}`;
      }

      if (endDate) {
        const endTime = endDate.getTime();
        dispatchQuery += ` AND d."dispatchDate" <= ${endTime}`;
        consumptionQuery += ` AND c."consumptionDate" <= ${endTime}`;
      }

      dispatchQuery += ` ORDER BY d."dispatchDate" DESC`;
      consumptionQuery += ` ORDER BY c."consumptionDate" DESC`;

      // Buscar despachos
      const dispatches_data = await db.execute(sql`${sql.raw(dispatchQuery)}`);

      // Buscar consumos
      const consumptions_data = await db.execute(sql`${sql.raw(consumptionQuery)}`);

      // Combinar despachos e consumos em um único array ordenado
      const movements = [
        ...(dispatches_data.rows || []).map((d: any) => ({
          id: `dispatch-${d.id}`,
          type: 'despacho',
          quantity: d.quantity,
          date: d.dispatchDate,
          status: d.status,
          notes: d.notes,
          recordedBy: d.dispatchedBy,
        })),
        ...(consumptions_data.rows || []).map((c: any) => ({
          id: `consumption-${c.id}`,
          type: 'consumo',
          quantity: c.quantity,
          date: c.consumptionDate,
          notes: c.notes,
          recordedBy: c.recordedBy,
        })),
      ].sort((a, b) => (b.date || 0) - (a.date || 0));

      return {
        ...supply,
        movements,
      };
    }));

    return history;
  } catch (error) {
    console.error('Erro ao obter histórico de movimentações:', error);
    throw error;
  }
}

export async function getMovementHistory() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  try {
    // Buscar a impressora EPSON P5000
    const epsonPrinter = await db
      .select()
      .from(printers)
      .where(and(like(printers.name, '%P5000%'), eq(printers.isActive, true)))
      .limit(1);

    if (!epsonPrinter || epsonPrinter.length === 0) {
      return [];
    }

    const printerId = epsonPrinter[0].id;

    // Buscar todos os insumos da EPSON P5000
    const supplies_list = await db
      .select()
      .from(supplies)
      .where(and(eq(supplies.printerId, printerId), eq(supplies.isActive, true)))
      .orderBy(asc(supplies.name));

    // Para cada insumo, buscar despachos e consumos
    const history = await Promise.all(supplies_list.map(async (supply) => {
      // Buscar despachos
      const dispatches_data = await db.execute(sql`
        SELECT 
          d.id,
          d.quantity,
          d."dispatchDate",
          d.status,
          d.notes,
          u.name as "dispatchedBy"
        FROM dispatches d
        LEFT JOIN users u ON d."dispatchedBy" = u.id
        WHERE d."supplyId" = ${supply.id}
        ORDER BY d."dispatchDate" DESC
      `);

      // Buscar consumos
      const consumptions_data = await db.execute(sql`
        SELECT 
          c.id,
          c.quantity,
          c."consumptionDate",
          c.notes,
          u.name as "recordedBy"
        FROM chic_consumptions c
        LEFT JOIN users u ON c."recordedBy" = u.id
        WHERE c."supplyId" = ${supply.id}
        ORDER BY c."consumptionDate" DESC
      `);

      // Combinar despachos e consumos em um único array ordenado
      const movements = [
        ...(dispatches_data.rows || []).map((d: any) => ({
          id: `dispatch-${d.id}`,
          type: 'despacho',
          quantity: d.quantity,
          date: d.dispatchDate,
          status: d.status,
          notes: d.notes,
          recordedBy: d.dispatchedBy,
        })),
        ...(consumptions_data.rows || []).map((c: any) => ({
          id: `consumption-${c.id}`,
          type: 'consumo',
          quantity: c.quantity,
          date: c.consumptionDate,
          notes: c.notes,
          recordedBy: c.recordedBy,
        })),
      ].sort((a, b) => (b.date || 0) - (a.date || 0));

      return {
        ...supply,
        movements,
      };
    }));

    return history;
  } catch (error) {
    console.error('Erro ao obter histórico de movimentações:', error);
    throw error;
  }
}
