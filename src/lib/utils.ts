import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Traduce códigos de error comunes de Firebase Auth a mensajes claros en español.
 */
export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-email":
      return "El correo electrónico no tiene un formato válido.";
    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta registrada con este correo.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/popup-closed-by-user":
      return "Se cerró la ventana de inicio de sesión antes de completar el proceso.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Intenta de nuevo en unos minutos.";
    case "auth/network-request-failed":
      return "Error de conexión. Verifica tu acceso a internet.";
    default:
      return "Ocurrió un error inesperado. Intenta nuevamente.";
  }
}

/**
 * Formatea un porcentaje de victorias seguro ante división por cero.
 */
export function getWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total <= 0) return 0;
  return Math.round((wins / total) * 100);
}
