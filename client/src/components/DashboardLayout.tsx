import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions, PermissionModule } from "@/hooks/useUserPermissions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Printer,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  FileBarChart,
  History,
  AlertTriangle,
  Truck,
  Users,
  Mail,
  Lock,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems: { icon: any; label: string; path: string; adminOnly?: boolean; requiredModule?: PermissionModule }[] = [
  { icon: Printer, label: "Impressoras", path: "/impressoras", requiredModule: "printers" },
  { icon: Package, label: "Insumos", path: "/insumos", requiredModule: "supplies" },
  { icon: ArrowDownToLine, label: "Entrada", path: "/entrada", requiredModule: "supplies" },
  { icon: ArrowUpFromLine, label: "Saida", path: "/saida", requiredModule: "supplies" },
  { icon: Truck, label: "Pedidos", path: "/pedidos", requiredModule: "orders" },
  { icon: Search, label: "Consultas", path: "/consultas", requiredModule: "supplies" },
  { icon: FileBarChart, label: "Relatorios", path: "/relatorios", requiredModule: "reports" },
  { icon: ArrowRight, label: "Despacho para CHIC", path: "/despacho", requiredModule: "supplies" },
  { icon: History, label: "Historico", path: "/historico", requiredModule: "supplies" },
  { icon: AlertTriangle, label: "Alertas", path: "/alertas", requiredModule: "supplies" },
  { icon: Users, label: "Usuarios", path: "/usuarios", requiredModule: "users" },
  { icon: Mail, label: "Config. E-mails", path: "/configuracoes/emails", requiredModule: "permissions" },
  { icon: Lock, label: "Permissoes", path: "/configuracoes/permissoes", adminOnly: true, requiredModule: "permissions" },
  { icon: BarChart3, label: "Auditoria", path: "/auditoria", adminOnly: true, requiredModule: "audit" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-8 p-10 max-w-md w-full bg-white rounded-2xl shadow-xl border border-violet-100">
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center mb-2 shadow-lg">
              <Printer className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center text-gray-900">
              Controle de Estoque
            </h1>
            <p className="text-sm text-gray-500 text-center max-w-sm leading-relaxed">
              Sistema de gerenciamento de insumos para impressoras da Studiolaser. Faça login para acessar o painel.
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();
  const { canView, isLoading: permissionsLoading } = useUserPermissions();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-white/70" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                   <picture>
                     <img src="/logo.png" alt="StudioLaser" className="h-8 shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                   </picture>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item: any) => {
                // Skip admin-only items if user is not admin
                if (item.adminOnly && user?.role !== 'admin') {
                  return null;
                }
                // Skip items that require a module permission the user doesn't have
                if (item.requiredModule && !permissionsLoading && !canView(item.requiredModule)) {
                  return null;
                }
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-white/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-white/20 shrink-0">
                    {(user as any)?.avatarUrl && (
                      <AvatarImage src={(user as any).avatarUrl} alt={user?.name || ""} />
                    )}
                    <AvatarFallback className="text-xs font-medium bg-white/20 text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-white">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-white/60 truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/usuarios")}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Limpar localStorage
                    localStorage.removeItem("user");
                    localStorage.removeItem("lastLogin");
                    logout();
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground font-medium">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
