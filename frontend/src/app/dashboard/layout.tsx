"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, authApi } from "@/lib/api";
import { Sidebar } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active?: boolean;
};

const canOpenPath = (role: string, pathname: string) => {
  if (role === "admin") return true;
  if (pathname.startsWith("/dashboard/users") || pathname.startsWith("/dashboard/export")) return false;
  if (role === "supervisor") return true;
  if (role === "sales") {
    return !pathname.startsWith("/dashboard/transactions") &&
      !pathname.startsWith("/dashboard/agreements");
  }
  return pathname === "/dashboard";
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!api.isAuthenticated()) {
        router.replace("/login");
        return;
      }

      try {
        const response = await authApi.verify();
        const user = response.data?.user || null;
        if (!user) {
          api.setToken(null);
          router.replace("/login");
          return;
        }

        setCurrentUser(user);
        if (!canOpenPath(user.role, pathname)) {
          router.replace("/dashboard");
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error("Auth verification failed:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b z-40">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
        </Button>
        <div className="flex items-center gap-2">
          <div className="text-left">
            <div className="font-bold text-sm">إدارة الأتيليه</div>
            {currentUser && <div className="text-[10px] text-muted-foreground">{currentUser.name}</div>}
          </div>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm">👗</div>
        </div>
      </div>

      <div className="hidden lg:block fixed top-4 left-4 z-50">
        <GlobalSearch />
      </div>

      <div className={`
        ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        transition-transform duration-300 ease-in-out
        fixed inset-y-0 right-0 z-50 w-72 lg:block
      `}>
        <Sidebar currentUser={currentUser} onItemClick={() => setSidebarOpen(false)} />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:mr-72 min-h-screen pt-20 lg:pt-6 pb-20 lg:pb-6">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
