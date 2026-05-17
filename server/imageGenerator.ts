import { createCanvas } from "canvas";

interface SupplyItem {
  supplyName: string;
  quantity: number;
  supplyCode?: string;
  supplyColor?: string;
}

interface SupplyGroup {
  printerName: string;
  items: SupplyItem[];
}

const SUPPLY_COLORS: Record<string, string> = {
  "Black": "#000000", "Cyan": "#00BCD4", "Magenta": "#E91E63", "Yellow": "#FFC107",
  "Red": "#F44336", "Green": "#4CAF50", "Blue": "#2196F3", "Orange": "#FF9800",
  "Purple": "#9C27B0", "Gray": "#9E9E9E", "Light Black": "#424242", "Light Cyan": "#80DEEA",
};

const getColor = (name?: string) => SUPPLY_COLORS[name || ""] || "#E5E7EB";
const getTextColor = (bg: string) => (bg === "#000000" || bg === "#424242") ? "#FFFFFF" : "#000000";

/**
 * Generate a JPEG image of supplies grouped by printer
 * Returns Buffer containing JPEG data
 */
export async function generateSuppliesImage(
  itemsByPrinter: Record<string, SupplyItem[]>,
  requestId: number
): Promise<Buffer> {
  // Calculate dimensions
  const cardWidth = 140;
  const cardHeight = 120;
  const gap = 12;
  const padding = 30;
  const headerHeight = 100;
  const printerNameHeight = 40;

  // Calculate grid layout
  let maxItemsPerRow = 0;
  let totalHeight = headerHeight + padding;

  Object.entries(itemsByPrinter).forEach(([_, items]) => {
    const itemsPerRow = Math.max(1, Math.floor((1200 - 2 * padding) / (cardWidth + gap)));
    maxItemsPerRow = Math.max(maxItemsPerRow, itemsPerRow);
    const rows = Math.ceil(items.length / itemsPerRow);
    totalHeight += printerNameHeight + rows * (cardHeight + gap) + gap;
  });

  const width = 1200;
  const height = Math.max(600, totalHeight);

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, headerHeight);
  ctx.fillStyle = "#7C3AED";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Solicitacao de Insumos", width / 2, 50);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText(`Solicitacao #${requestId}`, width / 2, 80);

  // Draw border under header
  ctx.strokeStyle = "#7C3AED";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, headerHeight);
  ctx.lineTo(width, headerHeight);
  ctx.stroke();

  let currentY = headerHeight + padding;

  // Draw items by printer
  Object.entries(itemsByPrinter).forEach(([printerName, items]) => {
    // Printer name
    ctx.fillStyle = "#333";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(printerName, padding, currentY + 25);
    currentY += printerNameHeight;

    // Draw cards
    const itemsPerRow = Math.max(1, Math.floor((width - 2 * padding) / (cardWidth + gap)));
    let cardX = padding;
    let cardY = currentY;
    let itemsInRow = 0;

    items.forEach((item, index) => {
      const bgColor = getColor(item.supplyColor);
      const textColor = getTextColor(bgColor);

      // Card background
      ctx.fillStyle = bgColor;
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

      // Card border
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

      // Item name
      ctx.fillStyle = textColor;
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      const maxChars = 15;
      let name = item.supplyName;
      if (name.length > maxChars) {
        name = name.substring(0, maxChars - 2) + "...";
      }
      ctx.fillText(name, cardX + cardWidth / 2, cardY + 30);

      // Item code
      if (item.supplyCode) {
        ctx.font = "10px Arial";
        ctx.fillStyle = textColor;
        ctx.globalAlpha = 0.8;
        ctx.fillText(item.supplyCode, cardX + cardWidth / 2, cardY + 50);
        ctx.globalAlpha = 1;
      }

      // Quantity
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = textColor;
      ctx.fillText(`${item.quantity} un`, cardX + cardWidth / 2, cardY + 75);

      // Move to next card position
      itemsInRow++;
      if (itemsInRow >= itemsPerRow) {
        cardX = padding;
        cardY += cardHeight + gap;
        itemsInRow = 0;
      } else {
        cardX += cardWidth + gap;
      }
    });

    currentY = cardY + cardHeight + gap;
  });

  // Footer
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  ctx.fillStyle = "#999";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Gerado em ${dateStr}`, width / 2, height - 20);

  // Convert to JPEG buffer
  return canvas.toBuffer("image/jpeg", { quality: 0.8 });
}
