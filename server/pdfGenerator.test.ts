import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePurchaseRequestPDF } from "./pdfGenerator";

// Mock fetch for image downloads
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("pdfGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return a small PNG buffer for images
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    ]);
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(pngHeader.buffer),
    });
  });

  it("should generate a PDF buffer", async () => {
    const items = [
      { supplyName: "Cartucho Cyan", quantity: 3, supplyCode: "T9132", supplyColor: "Cyan", printerName: "EPSON P5000" },
      { supplyName: "Cartucho Magenta", quantity: 2, supplyCode: "T9133", supplyColor: "Magenta", printerName: "EPSON P5000" },
    ];

    const result = await generatePurchaseRequestPDF(items, 1, "Test User", "Test notes");

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    // PDF files start with %PDF
    expect(result.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("should handle items without images", async () => {
    const items = [
      { supplyName: "Papel A3+", quantity: 10, supplyCode: "PA3", printerName: "EPSON P5000" },
    ];

    const result = await generatePurchaseRequestPDF(items, 2, "User");

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("should handle multiple printers", async () => {
    const items = [
      { supplyName: "Cartucho Cyan", quantity: 3, supplyCode: "T9132", supplyColor: "Cyan", printerName: "EPSON P5000" },
      { supplyName: "Tinta Black", quantity: 5, supplyCode: "T544", supplyColor: "Black", printerName: "EPSON L3150" },
      { supplyName: "Rolo Glossy", quantity: 2, supplyCode: "RG1", printerName: "3270 PLOTTER" },
    ];

    const result = await generatePurchaseRequestPDF(items, 3, "Admin User", "Urgente");

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("should handle empty items array gracefully", async () => {
    const items: any[] = [];

    const result = await generatePurchaseRequestPDF(items, 4);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result.toString("ascii", 0, 4)).toBe("%PDF");
  });

  it("should handle items with image URLs", async () => {
    const items = [
      { supplyName: "Cartucho Cyan", quantity: 3, supplyCode: "T9132", supplyColor: "Cyan", supplyImageUrl: "https://example.com/image.png", printerName: "EPSON P5000" },
    ];

    const result = await generatePurchaseRequestPDF(items, 5, "User");

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    // fetch should have been called for the logo + the supply image
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should handle fetch failures gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const items = [
      { supplyName: "Cartucho Black", quantity: 1, supplyCode: "T9131", supplyColor: "Black", supplyImageUrl: "https://example.com/broken.png", printerName: "EPSON P5000" },
    ];

    const result = await generatePurchaseRequestPDF(items, 6, "User");

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
    expect(result.toString("ascii", 0, 4)).toBe("%PDF");
  });
});
