import { describe, expect, it, beforeAll } from "vitest";
import { getDb, getEpsonP5000Supplies, getChicStockSummary } from "./db";

describe("Dispatch Functionality", () => {
  beforeAll(async () => {
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it("should retrieve EPSON P5000 supplies", async () => {
    const supplies = await getEpsonP5000Supplies();
    
    expect(supplies).toBeDefined();
    expect(Array.isArray(supplies)).toBe(true);
    
    // Should have at least some supplies
    if (supplies.length > 0) {
      const supply = supplies[0];
      expect(supply).toHaveProperty("id");
      expect(supply).toHaveProperty("name");
      expect(supply).toHaveProperty("currentStock");
      expect(supply).toHaveProperty("printerId");
    }
  });

  it("should retrieve CHIC stock summary", async () => {
    const summary = await getChicStockSummary();
    
    expect(summary).toBeDefined();
    expect(Array.isArray(summary)).toBe(true);
    
    // Should have supplies with stock info
    if (summary.length > 0) {
      const item = summary[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("chicStock");
      expect(item).toHaveProperty("studiolaserStock");
    }
  });

  it("EPSON P5000 supplies should have positive stock", async () => {
    const supplies = await getEpsonP5000Supplies();
    
    // All supplies should have non-negative stock
    supplies.forEach(supply => {
      expect(supply.currentStock).toBeGreaterThanOrEqual(0);
    });
  });

  it("CHIC stock summary should have valid stock values", async () => {
    const summary = await getChicStockSummary();
    
    summary.forEach(item => {
      const chicStock = typeof item.chicStock === 'string' ? parseInt(item.chicStock) : item.chicStock;
      const studiolaserStock = typeof item.studiolaserStock === 'string' ? parseInt(item.studiolaserStock) : item.studiolaserStock;
      expect(chicStock).toBeGreaterThanOrEqual(0);
      expect(studiolaserStock).toBeGreaterThanOrEqual(0);
    });
  });

  it("EPSON P5000 supplies should be sorted by name", async () => {
    const supplies = await getEpsonP5000Supplies();
    
    if (supplies.length > 1) {
      for (let i = 0; i < supplies.length - 1; i++) {
        expect(supplies[i].name.localeCompare(supplies[i + 1].name)).toBeLessThanOrEqual(0);
      }
    }
  });
});
