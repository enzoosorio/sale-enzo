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
