/**
 * Paleta de cores única para todos os gráficos
 * Garante que cada tipo de papel/cartucho tenha uma cor consistente e diferenciada
 */

export const COLOR_PALETTE: Record<string, string> = {
  // Cartuchos - Cores vibrantes
  "Cyan": "#00BFFF",
  "Light Cyan": "#87CEEB",
  "Magenta": "#FF1493",
  "Vivid Magenta": "#FF00FF",
  "Light Magenta": "#FF69B4",
  "Yellow": "#FFD700",
  "Black": "#1A1A1A",
  "Matte Black": "#2F2F2F",
  "Photo Black": "#0A0A0A",
  "Orange": "#FF8C00",
  "Violet": "#8B00FF",
  
  // Papéis - Cores únicas e diferenciadas (tons de marrom/bege)
  "Papel de 432mm x 50m 90g": "#8B6914",      // Marrom escuro
  "Papel de 600mm x 50m 90g": "#CD853F",      // Peru (marrom claro)
  "Papel de prova ProofTech Satin 250": "#DAA520",      // Goldenrod
  "Papel de prova ProofTech Satin 280": "#B8860B",      // Dark goldenrod
  "Papel de prova ProofTech Satin plus 230": "#F0E68C", // Khaki
  "Papel de prova ProofTech Satin plus 280": "#EDD5B1", // Peach puff
  "Tanque Residual": "#A9A9A9",               // Dark gray
  
  // Impressoras - Cores distintas
  "Epson L3150": "#4A90E2",
  "Epson P5000": "#7B68EE",
  "Epson PLOTTER": "#50C878",
  
  // Fallback
  "default": "#8884d8",
};

/**
 * Obtém a cor para um tipo de insumo
 */
export function getSupplyColor(supplyName: string): string {
  if (!supplyName) return COLOR_PALETTE["default"];
  
  // Procura correspondência exata
  if (COLOR_PALETTE[supplyName]) {
    return COLOR_PALETTE[supplyName];
  }
  
  // Procura correspondência parcial para papéis
  const lowerName = supplyName.toLowerCase();
  
  // Verificar papéis específicos por padrão
  if (lowerName.includes("432mm") && lowerName.includes("50m")) return "#8B6914";
  if (lowerName.includes("600mm") && lowerName.includes("50m")) return "#CD853F";
  if (lowerName.includes("prooftech") && lowerName.includes("250")) return "#DAA520";
  if (lowerName.includes("prooftech") && lowerName.includes("280") && !lowerName.includes("plus")) return "#B8860B";
  if (lowerName.includes("prooftech") && lowerName.includes("plus") && lowerName.includes("230")) return "#F0E68C";
  if (lowerName.includes("prooftech") && lowerName.includes("plus") && lowerName.includes("280")) return "#EDD5B1";
  
  // Verificar cartuchos
  if (lowerName.includes("cyan") && lowerName.includes("light")) return "#87CEEB";
  if (lowerName.includes("cyan")) return "#00BFFF";
  if (lowerName.includes("magenta") && lowerName.includes("light")) return "#FF69B4";
  if (lowerName.includes("magenta") || lowerName.includes("vivid magenta")) return "#FF00FF";
  if (lowerName.includes("yellow")) return "#FFD700";
  if (lowerName.includes("black") || lowerName.includes("matte black") || lowerName.includes("photo black")) return "#1A1A1A";
  if (lowerName.includes("orange")) return "#FF8C00";
  if (lowerName.includes("violet")) return "#8B00FF";
  
  // Verificar tanque
  if (lowerName.includes("tanque")) return "#A9A9A9";
  
  // Fallback para papéis genéricos
  if (lowerName.includes("papel") || lowerName.includes("paper")) return "#D2B48C";
  
  // Fallback padrão
  return COLOR_PALETTE["default"];
}

/**
 * Retorna array de cores para gráficos
 */
export function getChartColors(items: string[]): string[] {
  return items.map(item => getSupplyColor(item));
}
