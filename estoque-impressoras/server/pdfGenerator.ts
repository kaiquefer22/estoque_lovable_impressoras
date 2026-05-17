import PDFDocument from "pdfkit";

// Use built-in PDFKit fonts (Helvetica) - no external font files needed
const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

const SUPPLY_COLORS: Record<string, string> = {
  "Black": "#000000", "Cyan": "#00BCD4", "Magenta": "#E91E63", "Yellow": "#FFC107",
  "Red": "#F44336", "Green": "#4CAF50", "Blue": "#2196F3", "Orange": "#FF9800",
  "Purple": "#9C27B0", "Gray": "#9E9E9E", "Light Black": "#424242", "Light Cyan": "#80DEEA",
  "Light Magenta": "#F48FB1", "Vivid Magenta": "#C2185B", "Vivid Light Magenta": "#F06292",
  "Photo Black": "#1A1A1A", "Matte Black": "#333333", "White": "#FFFFFF",
};

interface PurchaseRequestItem {
  supplyName: string;
  quantity: number;
  supplyCode?: string;
  supplyColor?: string;
  supplyImageUrl?: string | null;
  printerName?: string;
}

/**
 * Fetch image from URL - returns raw buffer without sharp dependency
 * PDFKit can handle PNG and JPEG directly
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      console.log(`[PDF] Image fetch failed (${response.status}): ${url}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Only include images under 200KB to keep PDF size manageable
    if (buffer.length > 200000) {
      console.log(`[PDF] Image too large (${buffer.length} bytes), skipping: ${url}`);
      return null;
    }
    
    return buffer;
  } catch (error: any) {
    console.error(`[PDF] Error fetching image ${url}:`, error?.message || error);
    return null;
  }
}

/**
 * Try to compress image using sharp if available, fallback to raw buffer
 */
async function fetchAndCompressImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      console.log(`[PDF] Image fetch failed (${response.status}): ${url}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Try to use sharp for compression
    try {
      const sharp = (await import("sharp")).default;
      const compressed = await sharp(buffer)
        .resize(140, 140, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 55, progressive: true })
        .toBuffer();
      
      // If still too large, compress more aggressively
      if (compressed.length > 40000) {
        return await sharp(buffer)
          .resize(100, 100, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 35 })
          .toBuffer();
      }
      
      return compressed;
    } catch (sharpError: any) {
      // Sharp not available - use raw buffer if small enough
      console.log(`[PDF] Sharp not available, using raw image (${buffer.length} bytes)`);
      if (buffer.length > 200000) {
        console.log(`[PDF] Raw image too large, skipping`);
        return null;
      }
      return buffer;
    }
  } catch (error: any) {
    console.error(`[PDF] Error fetching image ${url}:`, error?.message || error);
    return null;
  }
}

/**
 * Generate a PDF document for a purchase request with supplies grouped by printer
 * Optimized for email attachment (target < 5MB)
 * Returns a Buffer containing the PDF data
 */
export async function generatePurchaseRequestPDF(
  items: PurchaseRequestItem[],
  requestId: number,
  requestedBy?: string,
  notes?: string
): Promise<Buffer> {
  console.log(`[PDF] Starting PDF generation for request #${requestId} with ${items.length} items`);
  
  // Group items by printer
  const itemsByPrinter: Record<string, PurchaseRequestItem[]> = {};
  items.forEach(item => {
    const key = item.printerName || "Sem Impressora";
    if (!itemsByPrinter[key]) itemsByPrinter[key] = [];
    itemsByPrinter[key].push(item);
  });

  // Pre-fetch and compress all images in parallel
  const imageBuffers: Map<string, Buffer> = new Map();
  const uniqueUrls = new Set(items.filter(i => i.supplyImageUrl).map(i => i.supplyImageUrl!));
  
  console.log(`[PDF] Fetching ${uniqueUrls.size} unique images...`);
  
  const compressionPromises = Array.from(uniqueUrls).map(async (url) => {
    const compressed = await fetchAndCompressImage(url);
    if (compressed) {
      imageBuffers.set(url, compressed);
    }
  });
  
  await Promise.all(compressionPromises);
  console.log(`[PDF] Successfully fetched ${imageBuffers.size}/${uniqueUrls.size} images`);

  // Create PDF document with built-in fonts
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    bufferPages: true,
  });

  // Collect PDF data into buffer
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => {
      const result = Buffer.concat(chunks);
      console.log(`[PDF] PDF buffer created: ${result.length} bytes`);
      resolve(result);
    });
    doc.on("error", (err) => {
      console.error(`[PDF] PDF document error:`, err);
      reject(err);
    });
  });

  const pageWidth = doc.page.width - 80; // margins
  const pageHeight = doc.page.height;
  let y = 40;

  // ==================== HEADER ====================
  doc.font(FONT_BOLD).fontSize(16).fillColor("#7C3AED");
  doc.text("StudioLaser", 40, y);
  doc.font(FONT_REGULAR).fontSize(9).fillColor("#666666");
  doc.text("Solicitacao de Insumos", 40, y + 22);

  // Request info on the right
  doc.font(FONT_REGULAR).fontSize(9).fillColor("#333333");
  doc.text(`Solicitacao #${requestId}`, 380, y + 5, { align: "right", width: 175 });
  const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  doc.text(`Data: ${dateStr}`, 380, y + 17, { align: "right", width: 175 });
  if (requestedBy) {
    doc.text(`Solicitante: ${requestedBy}`, 380, y + 29, { align: "right", width: 175 });
  }

  y += 60;

  // Divider line
  doc.moveTo(40, y).lineTo(40 + pageWidth, y).strokeColor("#7C3AED").lineWidth(1.5).stroke();
  y += 12;

  // ==================== SUMMARY ====================
  const totalItems = items.length;
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const printerCount = Object.keys(itemsByPrinter).length;

  doc.font(FONT_BOLD).fontSize(9).fillColor("#333333");
  doc.text(`Resumo: ${totalItems} insumo(s) | ${totalQty} unidade(s) | ${printerCount} impressora(s)`, 40, y);
  y += 16;

  if (notes) {
    doc.font(FONT_REGULAR).fontSize(8).fillColor("#555555");
    doc.text(`Observacoes: ${notes}`, 40, y, { width: pageWidth });
    y += 14;
  }

  y += 4;

  // ==================== TABLE PER PRINTER ====================
  const COL_IMAGE = 40;
  const COL_NAME = 85;
  const COL_CODE = 260;
  const COL_COLOR = 340;
  const COL_QTY = 450;
  const ROW_HEIGHT = 38;
  const HEADER_HEIGHT = 20;

  for (const [printerName, printerItems] of Object.entries(itemsByPrinter)) {
    // Check if we need a new page
    const estimatedHeight = HEADER_HEIGHT + 20 + (printerItems.length * ROW_HEIGHT);
    if (y + estimatedHeight > pageHeight - 60) {
      doc.addPage();
      y = 40;
    }

    // Printer section header
    doc.font(FONT_BOLD).fontSize(10).fillColor("#7C3AED");
    doc.text(`${printerName}`, 40, y);
    y += 18;

    // Table header
    doc.rect(40, y, pageWidth, HEADER_HEIGHT).fill("#7C3AED");
    doc.font(FONT_BOLD).fontSize(7).fillColor("#FFFFFF");
    doc.text("Img", COL_IMAGE + 3, y + 6);
    doc.text("Nome do Insumo", COL_NAME + 3, y + 6);
    doc.text("Codigo", COL_CODE + 3, y + 6);
    doc.text("Cor", COL_COLOR + 3, y + 6);
    doc.text("Qtd", COL_QTY + 3, y + 6);
    y += HEADER_HEIGHT;

    // Table rows
    for (let i = 0; i < printerItems.length; i++) {
      const item = printerItems[i];

      // Check if we need a new page
      if (y + ROW_HEIGHT > pageHeight - 60) {
        doc.addPage();
        y = 40;
        // Repeat header on new page
        doc.rect(40, y, pageWidth, HEADER_HEIGHT).fill("#7C3AED");
        doc.font(FONT_BOLD).fontSize(7).fillColor("#FFFFFF");
        doc.text("Img", COL_IMAGE + 3, y + 6);
        doc.text("Nome do Insumo", COL_NAME + 3, y + 6);
        doc.text("Codigo", COL_CODE + 3, y + 6);
        doc.text("Cor", COL_COLOR + 3, y + 6);
        doc.text("Qtd", COL_QTY + 3, y + 6);
        y += HEADER_HEIGHT;
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.rect(40, y, pageWidth, ROW_HEIGHT).fill("#F9FAFB");
      } else {
        doc.rect(40, y, pageWidth, ROW_HEIGHT).fill("#FFFFFF");
      }

      // Row border
      doc.rect(40, y, pageWidth, ROW_HEIGHT).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

      // Image column (small compressed thumbnail)
      if (item.supplyImageUrl && imageBuffers.has(item.supplyImageUrl)) {
        try {
          const imgBuffer = imageBuffers.get(item.supplyImageUrl)!;
          doc.image(imgBuffer, COL_IMAGE + 3, y + 3, { width: 30, height: 30, fit: [30, 30] });
        } catch (imgErr: any) {
          console.error(`[PDF] Error embedding image:`, imgErr?.message);
          doc.font(FONT_REGULAR).fontSize(7).fillColor("#999999");
          doc.text("-", COL_IMAGE + 13, y + 15);
        }
      } else {
        doc.font(FONT_REGULAR).fontSize(7).fillColor("#999999");
        doc.text("-", COL_IMAGE + 13, y + 15);
      }

      // Name column
      doc.font(FONT_REGULAR).fontSize(8).fillColor("#111111");
      doc.text(item.supplyName, COL_NAME + 3, y + 12, { width: 170, lineBreak: false });

      // Code column
      doc.font(FONT_REGULAR).fontSize(7).fillColor("#333333");
      doc.text(item.supplyCode || "-", COL_CODE + 3, y + 12, { width: 70, lineBreak: false });

      // Color column with color box
      if (item.supplyColor) {
        const colorHex = SUPPLY_COLORS[item.supplyColor] || "#E5E7EB";
        doc.rect(COL_COLOR + 3, y + 13, 11, 11).fill(`#${colorHex.replace('#', '')}`);
        doc.rect(COL_COLOR + 3, y + 13, 11, 11).strokeColor("#CCCCCC").lineWidth(0.5).stroke();
        doc.font(FONT_REGULAR).fontSize(7).fillColor("#333333");
        doc.text(item.supplyColor, COL_COLOR + 17, y + 13, { width: 50, lineBreak: false });
      } else {
        doc.font(FONT_REGULAR).fontSize(7).fillColor("#999999");
        doc.text("-", COL_COLOR + 3, y + 12);
      }

      // Quantity column
      doc.font(FONT_BOLD).fontSize(9).fillColor("#7C3AED");
      doc.text(`${item.quantity}`, COL_QTY + 3, y + 12, { width: 40 });

      y += ROW_HEIGHT;
    }

    y += 10; // Space between printer sections
  }

  // ==================== FOOTER ====================
  if (y + 15 > pageHeight - 60) {
    doc.addPage();
    y = 40;
  }

  y += 6;
  doc.moveTo(40, y).lineTo(40 + pageWidth, y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
  y += 6;
  doc.font(FONT_REGULAR).fontSize(7).fillColor("#999999");
  doc.text("Documento gerado automaticamente pelo Sistema de Estoque - StudioLaser", 40, y, { align: "center", width: pageWidth });

  doc.end();

  const result = await pdfReady;
  console.log(`[PDF] PDF generation complete for request #${requestId}: ${result.length} bytes`);
  return result;
}
