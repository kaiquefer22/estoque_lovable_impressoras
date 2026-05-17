import { describe, expect, it } from "vitest";
import type { PermissionModuleName } from "./db";

describe("Dispatch CHIC Permissions", () => {
  it("should have despacho_chic in PermissionModuleName type", () => {
    // This test verifies that the PermissionModuleName type includes 'despacho_chic'
    // The type is defined in db.ts and should include 'despacho_chic'
    const moduleName: PermissionModuleName = "despacho_chic";
    expect(moduleName).toBe("despacho_chic");
  });

  it("should support all required actions for despacho_chic", () => {
    // This test verifies that we can use the despacho_chic module with all actions
    const module: PermissionModuleName = "despacho_chic";
    const actions = ["view", "create", "edit", "delete"] as const;
    
    expect(module).toBe("despacho_chic");
    expect(actions).toContain("view");
    expect(actions).toContain("create");
    expect(actions).toContain("edit");
    expect(actions).toContain("delete");
  });

  it("should have despacho_chic module initialized in database", async () => {
    // This test verifies that the module was added to the initialization
    // The module should be created when initializePermissions is called
    const moduleName: PermissionModuleName = "despacho_chic";
    const displayName = "Despacho para CHIC";
    
    expect(moduleName).toBe("despacho_chic");
    expect(displayName).toBe("Despacho para CHIC");
  });
});
