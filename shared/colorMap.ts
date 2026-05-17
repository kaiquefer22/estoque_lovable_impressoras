/**
 * Mapeamento de nomes de cores para códigos hexadecimais
 * Usado para colorir os nomes das cores nos CSVs e tabelas
 */

export const COLOR_MAP: Record<string, string> = {
  // Cores primárias CMYK (cores profissionais de impressão)
  'Cyan': '#0099CC',
  'Magenta': '#FF0080',
  'Yellow': '#FFCC00',
  'Black': '#000000',
  'Photo Black': '#1A1A1A',
  'Matte Black': '#2D2D2D',
  'Light Cyan': '#80DEEA',
  'Light Magenta': '#F48FB1',
  'Vivid Magenta': '#E91E63',
  'Vivid Magenta Light': '#F06292',
  'Orange': '#FF9800',
  'Green': '#4CAF50',
  'Red': '#F44336',
  'Blue': '#2196F3',
  'Purple': '#9C27B0',
  'Violet': '#8B00FF',
  'Pink': '#FF69B4',
  'Brown': '#795548',
  'Gray': '#808080',
  'White': '#FFFFFF',
  'Light Black': '#4D4D4D',
  'Dark Gray': '#333333',
  'Light Gray': '#CCCCCC',
};

/**
 * Calcula se o texto deve ser branco ou preto baseado na cor de fundo
 * Usa a fórmula de luminância relativa do WCAG
 */
export function getTextColor(hexColor: string): 'white' | 'black' {
  // Remove o # se existir
  const hex = hexColor.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calcula luminância
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Se luminância > 0.5, usa texto preto, senão branco
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Obtém a cor hexadecimal para um nome de cor
 * Se não encontrar, tenta fazer um match parcial
 */
export function getColorHex(colorName: string): string | null {
  // Tenta match exato primeiro
  if (COLOR_MAP[colorName]) {
    return COLOR_MAP[colorName];
  }
  
  // Tenta match case-insensitive
  const lowerName = colorName.toLowerCase();
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // Tenta match parcial
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return null;
}

/**
 * Retorna estilos CSS para colorir um nome de cor
 */
export function getColorStyles(colorName: string): { backgroundColor: string; color: string } | null {
  const hex = getColorHex(colorName);
  if (!hex) return null;
  
  return {
    backgroundColor: hex,
    color: getTextColor(hex),
  };
}
