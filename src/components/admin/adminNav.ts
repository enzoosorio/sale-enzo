import {
  LayoutDashboard,
  Package,
  Layers,
  Tag,
  Palette,
  Image,
  Blend,
  Camera,
  Inbox,
  ShoppingBag,
  MapPin,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Active only on the exact path (the dashboard root would otherwise match every admin route). */
  exact?: boolean;
}

/** Single source for the desktop sidebar and the mobile chip bar. */
export const adminNavigationItems: AdminNavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Capturar", href: "/admin/capture/new", icon: Camera },
  { name: "Staging", href: "/admin/staging", icon: Inbox },
  { name: "Productos", href: "/admin/products", icon: Package },
  { name: "Pedidos", href: "/admin/orders", icon: ShoppingBag },
  { name: "Entregas", href: "/admin/delivery", icon: MapPin },
  { name: "Categorías", href: "/admin/categories", icon: Layers },
  { name: "Variantes", href: "/admin/variants", icon: Palette },
  { name: "Tags", href: "/admin/tags", icon: Tag },
  { name: "Imagenes", href: "/admin/images", icon: Image },
  { name: "Cluster Colores", href: "/admin/clustering", icon: Blend },
];

export const isAdminNavActive = (pathname: string, item: AdminNavItem) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);
