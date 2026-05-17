import { sendEmailWithAttachments } from "./sendgrid";
import { getAllNotificationEmails, getSupplyById, getPrinterById } from "./db";
import sharp from "sharp";

export interface StockAlertItem {
  supplyId: number;
  supplyName: string;
  supplyCode?: string;
  supplyColor?: string;
  supplyImageUrl?: string;
  currentStock: number;
  minStock: number;
  printerId?: number;
  printerName?: string;
}

/**
 * Generate HTML email content for stock alerts
 */
function generateStockAlertHTML(alertItems: StockAlertItem[]): string {
  const itemsByPrinter: Record<string, StockAlertItem[]> = {};
  
  alertItems.forEach(item => {
    const key = item.printerName || "Sem Impressora";
    if (!itemsByPrinter[key]) itemsByPrinter[key] = [];
    itemsByPrinter[key].push(item);
  });

  const SUPPLY_COLORS: Record<string, string> = {
    "Black": "#000000", "Cyan": "#00BCD4", "Magenta": "#E91E63", "Yellow": "#FFC107",
    "Red": "#F44336", "Green": "#4CAF50", "Blue": "#2196F3", "Orange": "#FF9800",
    "Purple": "#9C27B0", "Gray": "#9E9E9E", "Light Black": "#424242", "Light Cyan": "#80DEEA",
  };

  const getColor = (name?: string) => SUPPLY_COLORS[name || ""] || "#E5E7EB";

  let htmlContent = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
          .container { max-width: 100%; margin: 0 auto; }
          .header { background-color: #7C3AED; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; }
          .printer-section { margin-bottom: 20px; }
          .printer-name { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #7C3AED; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .items-table th { background-color: #7C3AED; color: white; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #7C3AED; font-size: 13px; }
          .items-table td { padding: 10px; border: 1px solid #E5E7EB; text-align: left; vertical-align: middle; font-size: 13px; }
          .items-table tr:nth-child(even) { background-color: #F9FAFB; }
          .alert-badge { background-color: #EF4444; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
          .item-image { max-width: 50px; max-height: 50px; border-radius: 3px; display: block; }
          .item-color-box { display: inline-block; width: 20px; height: 20px; border-radius: 3px; border: 1px solid #ccc; vertical-align: middle; }
          .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Alerta de Estoque Mínimo - StudioLaser</h1>
            <p style="margin: 5px 0 0 0;">Os seguintes insumos estão abaixo do estoque mínimo</p>
          </div>
  `;

  Object.entries(itemsByPrinter).forEach(([printerName, items]) => {
    htmlContent += `
      <div class="printer-section">
        <div class="printer-name">🖨️ ${printerName}</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Imagem</th>
              <th>Nome do Insumo</th>
              <th>Código</th>
              <th>Cor</th>
              <th>Estoque Atual</th>
              <th>Mínimo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    items.forEach(item => {
      const bgColor = getColor(item.supplyColor);
      const colorBox = `<span class="item-color-box" style="background-color:${bgColor};"></span>`;
      const imageCell = item.supplyImageUrl ? `<img src="${item.supplyImageUrl}" alt="${item.supplyName}" class="item-image" />` : '<span style="color:#999;">-</span>';
      const percentageOfMin = Math.round((item.currentStock / item.minStock) * 100);
      
      htmlContent += `
        <tr>
          <td style="text-align:center;">${imageCell}</td>
          <td><strong>${item.supplyName}</strong></td>
          <td>${item.supplyCode || '-'}</td>
          <td>${colorBox} ${item.supplyColor || '-'}</td>
          <td><strong>${item.currentStock} un</strong></td>
          <td>${item.minStock} un</td>
          <td><span class="alert-badge">${percentageOfMin}% do mínimo</span></td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </div>
    `;
  });

  htmlContent += `
        <div class="footer">
          <p>Este é um e-mail automático gerado pelo sistema de controle de estoque StudioLaser.</p>
          <p>Total de itens em alerta: ${alertItems.length}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
}

/**
 * Send stock alert email to configured notification recipients
 */
export async function sendStockAlertEmail(alertItems: StockAlertItem[]): Promise<boolean> {
  if (alertItems.length === 0) return false;

  try {
    // Get notification emails
    const notificationEmails = await getAllNotificationEmails();
    if (!notificationEmails || notificationEmails.length === 0) {
      console.log("[StockAlert] No notification emails configured");
      return false;
    }

    const recipientEmails = notificationEmails.map((e: any) => e.email);
    const htmlContent = generateStockAlertHTML(alertItems);

    // Send email without attachments for stock alerts
    const emailSent = await sendEmailWithAttachments(
      recipientEmails,
      `⚠️ Alerta de Estoque Mínimo - ${alertItems.length} item(ns) em alerta`,
      htmlContent,
      [] // No attachments for stock alerts
    );

    console.log(`[StockAlert] Email sent to ${recipientEmails.length} recipient(s): ${emailSent}`);
    return emailSent;
  } catch (error) {
    console.error("[StockAlert] Error sending alert email:", error);
    return false;
  }
}

/**
 * Check and send stock alerts for a single supply
 */
export async function checkAndSendStockAlert(supplyId: number, newStock: number, minStock: number): Promise<void> {
  if (newStock >= minStock) return; // No alert needed

  try {
    const supply = await getSupplyById(supplyId);
    if (!supply) return;

    const printer = supply.printerId ? await getPrinterById(supply.printerId) : null;

    const alertItem: StockAlertItem = {
      supplyId,
      supplyName: supply.name,
      supplyCode: supply.code || undefined,
      supplyColor: supply.color || undefined,
      supplyImageUrl: supply.imageUrl || undefined,
      currentStock: newStock,
      minStock,
      printerId: supply.printerId || undefined,
      printerName: printer?.name || undefined,
    };

    await sendStockAlertEmail([alertItem]);
  } catch (error) {
    console.error("[StockAlert] Error checking and sending alert:", error);
  }
}
