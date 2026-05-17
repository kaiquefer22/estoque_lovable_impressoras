/**
 * Validador de força de senha
 * Requisitos:
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial (!@#$%^&*)
 */

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-5
  feedback: string[];
  strength: "fraca" | "media" | "forte" | "muito_forte";
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Verificar comprimento
  if (password.length < 8) {
    feedback.push("A senha deve ter pelo menos 8 caracteres");
  } else {
    score++;
    if (password.length >= 12) score++;
  }

  // Verificar letra maiúscula
  if (!/[A-Z]/.test(password)) {
    feedback.push("A senha deve conter pelo menos uma letra maiúscula");
  } else {
    score++;
  }

  // Verificar letra minúscula
  if (!/[a-z]/.test(password)) {
    feedback.push("A senha deve conter pelo menos uma letra minúscula");
  } else {
    score++;
  }

  // Verificar número
  if (!/[0-9]/.test(password)) {
    feedback.push("A senha deve conter pelo menos um número");
  } else {
    score++;
  }

  // Verificar caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push("A senha deve conter pelo menos um caractere especial (!@#$%^&*)");
  } else {
    score++;
  }

  // Determinar força
  let strength: "fraca" | "media" | "forte" | "muito_forte";
  if (score <= 1) strength = "fraca";
  else if (score <= 2) strength = "media";
  else if (score <= 3) strength = "forte";
  else strength = "muito_forte";

  return {
    isValid: feedback.length === 0,
    score,
    feedback,
    strength,
  };
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case "fraca":
      return "text-red-600";
    case "media":
      return "text-orange-600";
    case "forte":
      return "text-yellow-600";
    case "muito_forte":
      return "text-green-600";
    default:
      return "text-gray-600";
  }
}

export function getPasswordStrengthLabel(strength: string): string {
  switch (strength) {
    case "fraca":
      return "Fraca";
    case "media":
      return "Média";
    case "forte":
      return "Forte";
    case "muito_forte":
      return "Muito Forte";
    default:
      return "Desconhecida";
  }
}
