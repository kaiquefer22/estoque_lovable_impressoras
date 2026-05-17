// CDN image URLs for printers and supplies
export const PRINTER_IMAGES: Record<string, string> = {
  "Epson P5000": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-p5000_78526c32.jpg",
  "SureColor P5000": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-p5000_78526c32.jpg",
  "Epson L3150": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-l3150_7ec5a153.jpg",
  "EcoTank L3150": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-l3150_7ec5a153.jpg",
  "Epson 3270 PLOTTER": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-t3270_788de2a8.jpg",
  "SureColor T3270": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/epson-t3270_788de2a8.jpg",
};

export const SUPPLY_IMAGES: Record<string, string> = {
  "T913": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/cartuchos-t913_991dccbd.jpg",
  "T6931": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/cartuchos-t6931_38e6c80a.jpg",
  "694": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/cartuchos-t6931_38e6c80a.jpg",
  "default_cartridge": "https://d2xsxph8kpxj0f.cloudfront.net/310519663273634876/DbBnizmN2jAuFKDuTsMnj7/cartuchos-set_4ad4c1d9.jpg",
};

export function getPrinterImage(name: string, model?: string): string | undefined {
  return PRINTER_IMAGES[name] || (model ? PRINTER_IMAGES[model] : undefined);
}

export function getSupplyImage(code?: string | null): string {
  if (!code) return SUPPLY_IMAGES["default_cartridge"];
  // Match by prefix
  for (const [key, url] of Object.entries(SUPPLY_IMAGES)) {
    if (code.startsWith(key)) return url;
  }
  return SUPPLY_IMAGES["default_cartridge"];
}
