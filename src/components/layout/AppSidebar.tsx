import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wrench,
  Shield,
  ScrollText,
  FileSpreadsheet,
  BarChart3,
  UserCircle2,
  Settings2,
  Package as PackageIcon,
  Tag,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, AppRole } from "@/hooks/useAuth";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
};

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["ADMIN", "SALES", "TEKNISI", "VIEWER"] },
  { title: "Pelanggan", url: "/pelanggan", icon: Users, roles: ["ADMIN", "SALES", "VIEWER", "TEKNISI"] },
  { title: "Daftar Pelanggan", url: "/pelanggan/baru", icon: UserPlus, roles: ["ADMIN", "SALES"] },
  { title: "Antrian Teknisi", url: "/antrian", icon: Wrench, roles: ["ADMIN", "TEKNISI", "VIEWER"] },
];

const reportItems: NavItem[] = [
  { title: "Statistik", url: "/statistik", icon: BarChart3, roles: ["ADMIN", "SALES", "TEKNISI", "VIEWER"] },
  { title: "Log Aktivitas", url: "/logs", icon: ScrollText, roles: ["ADMIN", "VIEWER"] },
  { title: "Rekap Excel", url: "/rekap", icon: FileSpreadsheet, roles: ["ADMIN", "SALES", "VIEWER"] },
];

const adminItems: NavItem[] = [
  { title: "Manajemen User", url: "/users", icon: Shield, roles: ["ADMIN"] },
  { title: "Paket Internet", url: "/admin/packages", icon: PackageIcon, roles: ["ADMIN"] },
  { title: "Jenis Pelanggan", url: "/admin/customer-types", icon: Tag, roles: ["ADMIN"] },
  { title: "Pengaturan Website", url: "/admin/settings/general", icon: Settings2, roles: ["ADMIN"] },
];

const accountItems: NavItem[] = [
  { title: "Profil Saya", url: "/profil", icon: UserCircle2, roles: ["ADMIN", "SALES", "TEKNISI", "VIEWER"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, profile } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

  const filterByRole = (items: NavItem[]) =>
    items.filter((it) => !role || it.roles.includes(role));

  const renderItems = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => {
        const active = isActive(item.url);
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
                )}
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="DG-KOMPUTER"
              className="h-12 w-auto object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-semibold">DG-KOMPUTER</span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                {profile?.nama ?? "—"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operasional</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(filterByRole(mainItems))}</SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(reportItems).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Laporan</SidebarGroupLabel>}
            <SidebarGroupContent>{renderItems(filterByRole(reportItems))}</SidebarGroupContent>
          </SidebarGroup>
        )}

        {filterByRole(adminItems).length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administrasi</SidebarGroupLabel>}
            <SidebarGroupContent>{renderItems(filterByRole(adminItems))}</SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Akun</SidebarGroupLabel>}
          <SidebarGroupContent>{renderItems(filterByRole(accountItems))}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
