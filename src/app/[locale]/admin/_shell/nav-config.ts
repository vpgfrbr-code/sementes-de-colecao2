import {
  BarChart3,
  Boxes,
  FolderTree,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Star,
  Store,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/seed-banks", label: "Seed Banks", icon: Store },
  { href: "/admin/cupons", label: "Cupons", icon: Tag },
  { href: "/admin/revendedores", label: "Revendedores", icon: Users },
];

export const SECONDARY_NAV: AdminNavItem[] = [
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/media", label: "Mídia", icon: Images },
  { href: "/admin/destaques", label: "Destaques", icon: Star },
  { href: "/admin/flash-sale", label: "Flash Sale", icon: Zap },
  { href: "/admin/reviews", label: "Avaliações", icon: MessageSquare },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

export const SUPERADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export const BOTTOM_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Início", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: Package },
  { href: "/admin/produtos", label: "Produtos", icon: Boxes },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
];

/** Map every admin path segment to a human label for breadcrumbs. */
export const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  pedidos: "Pedidos",
  produtos: "Produtos",
  categorias: "Categorias",
  "seed-banks": "Seed Banks",
  cupons: "Cupons",
  revendedores: "Revendedores",
  banners: "Banners",
  media: "Mídia",
  destaques: "Destaques",
  "flash-sale": "Flash Sale",
  reviews: "Avaliações",
  relatorios: "Relatórios",
  configuracoes: "Configurações",
  novo: "Novo",
  editar: "Editar",
};
