"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi, api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-data";
import { KeyRound, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: "بيانات ناقصة",
        description: "اكتب البريد الإلكتروني وكلمة المرور",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.data) {
        api.setToken(response.data.token);
        toast({
          title: "تم تسجيل الدخول",
          description: `أهلاً بك، ${response.data.user.name}`,
        });
        router.push("/dashboard");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "بيانات الدخول غير صحيحة";
      toast({
        title: "تعذر تسجيل الدخول",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-slate-100 p-4" dir="rtl">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <span className="text-3xl">👗</span>
          </div>
          <div>
            <CardTitle className="text-2xl font-black">نظام إدارة الأتيليه</CardTitle>
            <CardDescription className="mt-2">
              إدارة الحجوزات والعملاء والقطع والحسابات من مكان واحد
            </CardDescription>
          </div>
          <div className="text-xs font-medium text-muted-foreground">دخول تجريبي للنظام</div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-bold">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="demo@atelier.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className="text-left pr-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-bold">
                كلمة المرور
              </label>
              <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  className="text-left pr-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>

            <button
              type="button"
              onClick={fillDemo}
              className="w-full rounded-xl border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="font-bold text-foreground">حساب التجربة:</span>
              <span className="block mt-1" dir="ltr">{DEMO_EMAIL}</span>
              <span className="block" dir="ltr">{DEMO_PASSWORD}</span>
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
