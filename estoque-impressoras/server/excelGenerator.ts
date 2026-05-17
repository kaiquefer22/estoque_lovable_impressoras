import ExcelJS from "exceljs";

interface ExcelItem {
  supplyName: string;
  quantity: number;
  supplyCode?: string;
  supplyColor?: string;
  supplyImageUrl?: string;
  printerName?: string;
}

const SUPPLY_COLORS: Record<string, string> = {
  "Black": "FF000000", "Cyan": "FF00BCD4", "Magenta": "FFE91E63", "Yellow": "FFFFC107",
  "Red": "FFF44336", "Green": "FF4CAF50", "Blue": "FF2196F3", "Orange": "FFFF9800",
  "Purple": "FF9C27B0", "Gray": "FF9E9E9E", "Light Black": "FF424242", "Light Cyan": "FF80DEEA",
};

/**
 * Generate an Excel file (Buffer) for purchase request with supplies list
 */
export async function generatePurchaseRequestExcel(
  items: ExcelItem[],
  requestId: number,
  requestedBy: string,
  notes?: string | null
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StudioLaser - Estoque";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Solicitação de Insumos", {
    properties: { defaultColWidth: 18 },
  });

  // Title row
  sheet.mergeCells("A1:F1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `Solicitação de Insumos #${requestId} - StudioLaser`;
  titleCell.font = { bold: true, size: 14, color: { argb: "FF7C3AED" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  // Info rows
  sheet.mergeCells("A2:F2");
  const infoCell = sheet.getCell("A2");
  infoCell.value = `Solicitado por: ${requestedBy} | Data: ${new Date().toLocaleDateString("pt-BR")} | Total: ${items.reduce((s, i) => s + i.quantity, 0)} unidades`;
  infoCell.font = { size: 10, color: { argb: "FF555555" } };
  infoCell.alignment = { horizontal: "center" };

  if (notes) {
    sheet.mergeCells("A3:F3");
    const notesCell = sheet.getCell("A3");
    notesCell.value = `Observações: ${notes}`;
    notesCell.font = { italic: true, size: 9, color: { argb: "FF777777" } };
    notesCell.alignment = { horizontal: "center" };
  }

  // Group items by printer
  const itemsByPrinter: Record<string, ExcelItem[]> = {};
  items.forEach(item => {
    const key = item.printerName || "Sem Impressora";
    if (!itemsByPrinter[key]) itemsByPrinter[key] = [];
    itemsByPrinter[key].push(item);
  });

  let currentRow = notes ? 5 : 4;

  for (const [printerName, printerItems] of Object.entries(itemsByPrinter)) {
    // Printer header
    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const printerCell = sheet.getCell(`A${currentRow}`);
    printerCell.value = `🖨️ ${printerName}`;
    printerCell.font = { bold: true, size: 11, color: { argb: "FF7C3AED" } };
    printerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
    sheet.getRow(currentRow).height = 22;
    currentRow++;

    // Table header
    const headerRow = sheet.getRow(currentRow);
    const headers = ["#", "Nome do Insumo", "Código", "Cor", "Quantidade", "Imagem (URL)"];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FF7C3AED" } },
        bottom: { style: "thin", color: { argb: "FF7C3AED" } },
        left: { style: "thin", color: { argb: "FF7C3AED" } },
        right: { style: "thin", color: { argb: "FF7C3AED" } },
      };
    });
    headerRow.height = 20;
    currentRow++;

    // Data rows
    printerItems.forEach((item, idx) => {
      const row = sheet.getRow(currentRow);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = item.supplyName;
      row.getCell(3).value = item.supplyCode || "-";
      row.getCell(4).value = item.supplyColor || "-";
      row.getCell(5).value = item.quantity;
      row.getCell(6).value = item.supplyImageUrl || "-";

      // Style the color cell with background color
      if (item.supplyColor && SUPPLY_COLORS[item.supplyColor]) {
        const colorArgb = SUPPLY_COLORS[item.supplyColor];
        row.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: colorArgb } };
        // White text for dark colors
        const darkColors = ["FF000000", "FF424242", "FF9C27B0", "FFE91E63", "FFF44336", "FF2196F3"];
        if (darkColors.includes(colorArgb)) {
          row.getCell(4).font = { color: { argb: "FFFFFFFF" }, bold: true };
        }
      }

      // Alternating row colors
      const bgColor = idx % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF";
      for (let i = 1; i <= 6; i++) {
        if (i !== 4 || !item.supplyColor || !SUPPLY_COLORS[item.supplyColor || ""]) {
          row.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        }
        row.getCell(i).border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        row.getCell(i).alignment = { vertical: "middle", horizontal: i === 5 ? "center" : "left" };
      }

      row.height = 20;
      currentRow++;
    });

    currentRow++; // Space between sections
  }

  // Set column widths
  sheet.getColumn(1).width = 5;
  sheet.getColumn(2).width = 30;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 45;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
