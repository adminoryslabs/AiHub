// Íconos de la UI — Lucide (trazo 1.75, color con currentColor)
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChartColumn,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  ExternalLink,
  FileSearch,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  Link as LinkIcon,
  Link2Off,
  LogOut,
  Menu,
  MessagesSquare,
  Network,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  // navegación y acciones
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  arrow_outward: ArrowUpRight,
  open_in_new: ExternalLink,
  close: X,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  sync: RefreshCw,
  check: Check,
  content_copy: Copy,
  search: Search,
  menu: Menu,
  // secciones y conceptos
  dashboard: LayoutDashboard,
  article: FileText,
  link: LinkIcon,
  image: ImageIcon,
  bar_chart: ChartColumn,
  admin_panel_settings: ShieldCheck,
  settings: Settings,
  language: Languages,
  account_tree: GitBranch,
  hub: Network,
  forum: MessagesSquare,
  logout: LogOut,
  // estados
  check_circle: CheckCircle2,
  warning: TriangleAlert,
  rate_review: FileSearch,
  archive: Archive,
  verified: BadgeCheck,
  link_off: Link2Off,
  cloud_upload: CloudUpload,
};

const SIZE_PX = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

interface IconProps {
  name: string;
  className?: string;
  size?: keyof typeof SIZE_PX;
}

export function Icon({ name, className = '', size = 'md' }: IconProps) {
  const Component = ICONS[name];
  if (!Component) return null;

  return (
    <Component
      size={SIZE_PX[size]}
      strokeWidth={1.75}
      className={className}
      aria-hidden="true"
    />
  );
}
