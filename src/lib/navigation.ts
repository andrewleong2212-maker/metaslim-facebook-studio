import { ChartLineUp, CirclesFour, FacebookLogo, FileText, Gauge, Gear, Kanban, MagicWand, Notepad, WaveSine } from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

export type NavItem = { label: string; shortLabel: string; href: string; icon: Icon };

export const navigation: NavItem[] = [
  { label: "Dashboard", shortLabel: "首页", href: "/", icon: CirclesFour },
  { label: "Facebook Research", shortLabel: "研究", href: "/facebook-research", icon: FacebookLogo },
  { label: "Malaysia Trend Radar", shortLabel: "趋势", href: "/trend-radar", icon: WaveSine },
  { label: "Content Materials", shortLabel: "素材", href: "/content-materials", icon: FileText },
  { label: "Content Generator", shortLabel: "生成", href: "/content-generator", icon: MagicWand },
  { label: "Script Studio", shortLabel: "脚本", href: "/script-studio", icon: Notepad },
  { label: "Production Board", shortLabel: "制作", href: "/production-board", icon: Kanban },
  { label: "Facebook Performance", shortLabel: "表现", href: "/facebook-performance", icon: ChartLineUp },
  { label: "Weekly AI Review", shortLabel: "复盘", href: "/weekly-review", icon: Gauge },
  { label: "Settings", shortLabel: "设置", href: "/settings", icon: Gear }
];
