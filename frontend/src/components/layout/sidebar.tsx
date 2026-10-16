"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Wallet,
  FileText,
  FileDown,
  ScrollText,
  LogOut,
  UserCog,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

type UserRole = "admin" | "supervisor" | "sales";

interface SidebarProps {
  onItemClick?: () => void;
  currentUser?: {
    name: string;
    role: string;
  } | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  supervisor: "مشرف",
  sales: "سيلز",
};

const menuItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, roles: ["admin", "supervisor", "sales"] },
  { href: "/dashboard/customers", label: "العملاء", icon: Users, roles: ["admin", "supervisor", "sales"] },
  { href: "/dashboard/dresses", label: "القطع", icon: ShoppingBag, roles: ["admin", "supervisor", "sales"] },
  { href: "/dashboard/orders", label: "الحجوزات", icon: FileText, roles: ["admin", "supervisor", "sales"] },
  { href: "/dashboard/transactions", label: "الحسابات", icon: Wallet, roles: ["admin", "supervisor"] },
  { href: "/dashboard/agreements", label: "العقود", icon: ScrollText, roles: ["admin", "supervisor"] },
  { href: "/dashboard/users", label: "المستخدمون والصلاحيات", icon: UserCog, roles: ["admin"] },
  { href: "/dashboard/export", label: "تصدير البيانات", icon: FileDown, roles: ["admin"] },
];

export function Sidebar({ onItemClick, currentUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = (currentUser?.role || "sales") as UserRole;
  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    api.setToken(null);
    router.push("/login");
  };

  return (
    <aside className="fixed right-0 top-0 z-40 h-[100dvh] w-full bg-white/95 backdrop-blur-md border-l shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="flex h-20 sm:h-24 flex-col justify-center gap-1 px-5 sm:px-7 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
              <span className="text-2xl text-white">👗</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-primary">نظام إدارة الأتيليه</h1>
              <p className="text-xs font-medium text-muted-foreground">الحجوزات والمخزون والحسابات</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-primary/60")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 space-y-3 bg-muted/30">
          {currentUser && (
            <div className="rounded-2xl bg-white border px-4 py-3">
              <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-bold">{ROLE_LABELS[currentUser.role] || currentUser.role}</span>
              </div>
              <p className="text-sm font-semibold truncate">{currentUser.name}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="h-5 w-5 text-muted-foreground/60" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}
