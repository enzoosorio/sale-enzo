/**
 * Sistema de toasts/notificaciones para feedback al usuario
 * 
 * IMPLEMENTACIÓN TEMPORAL:
 * Actualmente usa alert() nativo del navegador.
 * 
 * PRÓXIMOS PASOS PARA PRODUCCIÓN:
 * Instalar y configurar una librería de toasts como:
 * - react-hot-toast: npm install react-hot-toast
 * - sonner: npm install sonner
 * - react-toastify: npm install react-toastify
 * 
 * Ejemplo con react-hot-toast:
 * 
 * import toast from 'react-hot-toast';
 * 
 * export function showToast(message: string, type: "success" | "error" | "info") {
 *   if (type === "success") {
 *     toast.success(message);
 *   } else if (type === "error") {
 *     toast.error(message);
 *   } else {
 *     toast(message);
 *   }
 * }
 * 
 * Y agregar el Toaster en el layout:
 * import { Toaster } from 'react-hot-toast';
 * 
 * <Toaster position="top-center" />
 */

import toast from "react-hot-toast";

type ToastType = "success" | "error" | "info";

/**
 * Muestra un mensaje toast al usuario
 * 
 * @param message - Mensaje a mostrar
 * @param type - Tipo de toast (success, error, info)
 */
export function showToast(message: string, type: ToastType = "info"): void {
  if (type === "success") {
    toast.success(message);
  } else if (type === "error") {
    toast.error(message);
  } else {
    toast(message);
  }
}
