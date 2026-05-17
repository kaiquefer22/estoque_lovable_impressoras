import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  getAllPrinters: vi.fn().mockResolvedValue([
    { id: 1, name: "Epson P5000", model: "SureColor P5000", brand: "Epson", description: null, isActive: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "Epson L3150", model: "EcoTank L3150", brand: "Epson", description: null, isActive: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getPrinterById: vi.fn().mockResolvedValue(
    { id: 1, name: "Epson P5000", model: "SureColor P5000", brand: "Epson", description: null, isActive: 1, createdAt: new Date(), updatedAt: new Date() }
  ),
  createPrinter: vi.fn().mockResolvedValue(10),
  updatePrinter: vi.fn().mockResolvedValue(undefined),
  deletePrinter: vi.fn().mockResolvedValue(undefined),
  getAllSupplies: vi.fn().mockResolvedValue([
    { id: 1, name: "Photo Black", code: "T9131", type: "cartucho", color: "Photo Black", colorHex: "#1a1a1a", currentStock: 0, minStock: 1, printerId: 1, unit: "un", isActive: 1, description: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getSupplyById: vi.fn().mockResolvedValue({ id: 1, name: "Photo Black", currentStock: 5, minStock: 1, unit: "un" }),
  createSupply: vi.fn().mockResolvedValue(20),
  updateSupply: vi.fn().mockResolvedValue(undefined),
  deleteSupply: vi.fn().mockResolvedValue(undefined),
  getSuppliesWithPrinter: vi.fn().mockResolvedValue([
    { supply: { id: 1, name: "Photo Black", code: "T9131", type: "cartucho", color: "Photo Black", colorHex: "#1a1a1a", currentStock: 0, minStock: 1, printerId: 1, unit: "un", isActive: 1 }, printerName: "Epson P5000", printerModel: "SureColor P5000" },
  ]),
  getLowStockSupplies: vi.fn().mockResolvedValue([
    { supply: { id: 1, name: "Photo Black", code: "T9131", currentStock: 0, minStock: 1 }, printerName: "Epson P5000", printerModel: "SureColor P5000" },
  ]),
  createStockMovement: vi.fn().mockResolvedValue({ id: 1, previousStock: 0, newStock: 5 }),
  getStockMovements: vi.fn().mockResolvedValue({ movements: [], total: 0 }),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalPrinters: 3, totalSupplies: 26, totalMovements: 0, lowStockCount: 24, recentMovements: [],
  }),
  getStockByPrinter: vi.fn().mockResolvedValue([
    { printerId: 1, printerName: "Epson P5000", printerModel: "SureColor P5000", totalSupplies: 14, totalStock: 0, lowStockItems: 14 },
  ]),
  createPurchaseOrder: vi.fn().mockResolvedValue(1),
  addPurchaseOrderItems: vi.fn().mockResolvedValue(undefined),
  getPurchaseOrders: vi.fn().mockResolvedValue([]),
  getPurchaseOrderById: vi.fn().mockResolvedValue(null),
  updatePurchaseOrder: vi.fn().mockResolvedValue(undefined),
  updatePurchaseOrderItem: vi.fn().mockResolvedValue(undefined),
  markOrderDelivered: vi.fn().mockResolvedValue(undefined),
  getOutOfStockSupplies: vi.fn().mockResolvedValue([]),
  getAllUsers: vi.fn().mockResolvedValue([]),
  getUserById: vi.fn().mockResolvedValue(null),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  hasPermission: vi.fn().mockResolvedValue(true),
  checkUserPermission: vi.fn().mockResolvedValue(true),
  getUserPermissions: vi.fn().mockResolvedValue({ permissions: [] }),
  updateUserPermissions: vi.fn().mockResolvedValue(undefined),
  initializePermissions: vi.fn().mockResolvedValue(undefined),
  logAudit: vi.fn().mockResolvedValue(undefined),
  getAuditLogs: vi.fn().mockResolvedValue([]),
  getAuditLogCount: vi.fn().mockResolvedValue(0),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  createUserWithPassword: vi.fn().mockResolvedValue({ id: 99, email: 'newuser@example.com', name: 'New User' }),
  getUserPermissionsMap: vi.fn().mockResolvedValue({}),
  assignUserPermissions: vi.fn().mockResolvedValue(true),
  initializeDefaultPermissions: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("printers router", () => {
  it("lists all printers", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.printers.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Epson P5000");
  });

  it("gets printer by id", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.printers.getById({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Epson P5000");
  });

  it("creates a printer (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.printers.create({
      name: "Test Printer",
      model: "Test Model",
    });
    expect(result.id).toBe(10);
  });

  it("rejects create without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.printers.create({ name: "Test", model: "Test" })
    ).rejects.toThrow();
  });
});

describe("supplies router", () => {
  it("lists supplies", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.supplies.list();
    expect(result).toHaveLength(1);
  });

  it("gets low stock supplies", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.supplies.getLowStock();
    expect(result).toHaveLength(1);
    expect(result[0].supply.currentStock).toBe(0);
  });

  it("creates a supply (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.supplies.create({
      name: "Test Supply",
      code: "TEST001",
      color: "Black",
      quantity: 10,
      minStock: 1,
      printerIds: [1],
    });
    expect(result.id).toBe(20);
  });
});

describe("movements router", () => {
  it("creates a stock movement (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.movements.create({
      supplyId: 1,
      type: "entrada",
      quantity: 5,
    });
    expect(result).toHaveProperty('id');
    expect(result.previousStock).toBe(0);
    expect(result.newStock).toBe(5);
  });

  it("lists movements", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.movements.list({});
    expect(result.movements).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("rejects movement without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.movements.create({
        supplyId: 1,
        quantity: 5,
        type: "entrada",
      })
    ).rejects.toThrow();
  });
});

describe("movements batch router", () => {
  it("creates batch movements (authenticated)", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.movements.createBatch({
      movements: [
        { supplyId: 1, type: "entrada", quantity: 5 },
        { supplyId: 1, type: "saida", quantity: 2 },
      ],
    });
    expect(result.ids).toHaveLength(2);
  });

  it("rejects batch without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.movements.createBatch({
        movements: [
          { supplyId: 1, type: "entrada", quantity: 5 },
        ],
      })
    ).rejects.toThrow();
  });
});

describe("dashboard router", () => {
  it("returns dashboard stats", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dashboard.stats();
    expect(result.totalPrinters).toBe(3);
    expect(result.totalSupplies).toBe(26);
    expect(result.lowStockCount).toBe(24);
  });

  it("returns stock by printer", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dashboard.stockByPrinter();
    expect(result).toHaveLength(1);
    expect(result[0].printerName).toBe("Epson P5000");
  });
});


describe("users router - createUserAdmin", () => {
  it("creates a new user with password (admin only)", async () => {
    const adminContext = {
      ...createAuthContext(),
      user: {
        ...createAuthContext().user!,
        role: "admin" as const,
      },
    };
    const caller = appRouter.createCaller(adminContext);
    const result = await caller.users.createUserAdmin({
      name: "New User",
      email: "newuser@example.com",
      password: "SecurePass123!",
      role: "user",
    });
    expect(result.success).toBe(true);
    expect(result.userId).toBeDefined();
  });

  it("rejects create user without admin role", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.users.createUserAdmin({
        name: "New User",
        email: "newuser@example.com",
        password: "SecurePass123!",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("rejects weak password", async () => {
    const adminContext = {
      ...createAuthContext(),
      user: {
        ...createAuthContext().user!,
        role: "admin" as const,
      },
    };
    const caller = appRouter.createCaller(adminContext);
    await expect(
      caller.users.createUserAdmin({
        name: "New User",
        email: "newuser@example.com",
        password: "weak",
        role: "user",
      })
    ).rejects.toThrow();
  });


});
