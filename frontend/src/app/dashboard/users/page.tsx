"use client";

import { useEffect, useMemo, useState } from "react";
import { usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";

type Role = "admin" | "supervisor" | "sales";

type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
};

const ROLE_INFO: Record<Role, { label: string; description: string; permissions: string[] }> = {
  admin: {
    label: "مدير النظام",
    description: "صلاحية كاملة على النظام وإعداداته.",
    permissions: ["كل الأقسام", "الحسابات والتقارير", "المستخدمون والصلاحيات", "تصدير البيانات"],
  },
  supervisor: {
    label: "مشرف",
    description: "إدارة التشغيل اليومي بدون إعدادات المدير الحساسة.",
    permissions: ["العملاء", "القطع", "الحجوزات", "الحسابات", "العقود"],
  },
  sales: {
    label: "سيلز",
    description: "الحجوزات والعملاء والقطع فقط.",
    permissions: ["إضافة عميل", "إنشاء حجز", "عرض القطع والتوفر", "متابعة الحجوزات"],
  },
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "sales" as Role });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.list();
      setUsers((response.data?.users || []) as UserRecord[]);
    } catch (error) {
      toast({
        title: "تعذر تحميل المستخدمين",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تحميل حسابات الفريق.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.is_active).length,
    supervisors: users.filter((user) => user.role === "supervisor").length,
    sales: users.filter((user) => user.role === "sales").length,
  }), [users]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "بيانات ناقصة", description: "اكتب اسم المستخدم والبريد الإلكتروني.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const response = await usersApi.create({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        is_active: true,
      });
      if (!response.success) throw new Error(response.message || "تعذر إضافة المستخدم");
      toast({ title: "تمت إضافة المستخدم", description: "تم إنشاء الحساب وتحديد الصلاحية." });
      setForm({ name: "", email: "", role: "sales" });
      setShowForm(false);
      await loadUsers();
    } catch (error) {
      toast({
        title: "تعذر إضافة المستخدم",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateUser = async (user: UserRecord, patch: Partial<UserRecord>) => {
    try {
      const response = await usersApi.update(user.id, patch);
      if (!response.success) throw new Error(response.message || "تعذر تحديث المستخدم");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, ...patch } : item));
      toast({ title: "تم حفظ التعديل" });
    } catch (error) {
      toast({
        title: "تعذر حفظ التعديل",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء التحديث.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-bold">إدارة الفريق</span>
          </div>
          <h1 className="text-3xl font-black">المستخدمون والصلاحيات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف أعضاء الفريق وحدد ما يمكن لكل دور الوصول إليه داخل النظام.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="h-11 gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          إضافة مستخدم
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">إجمالي المستخدمين</p><p className="mt-1 text-2xl font-black">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">الحسابات النشطة</p><p className="mt-1 text-2xl font-black text-green-600">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">المشرفون</p><p className="mt-1 text-2xl font-black">{stats.supervisors}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">السيلز</p><p className="mt-1 text-2xl font-black">{stats.sales}</p></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.keys(ROLE_INFO) as Role[]).map((role) => (
          <Card key={role} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCog className="h-5 w-5 text-primary" />
                {ROLE_INFO[role].label}
              </CardTitle>
              <CardDescription>{ROLE_INFO[role].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ROLE_INFO[role].permissions.map((permission) => (
                <div key={permission} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {permission}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>حسابات الفريق</CardTitle>
          <CardDescription>غيّر الدور أو أوقف الحساب بدون حذف بياناته.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">{user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={user.role}
                  onChange={(event) => updateUser(user, { role: event.target.value as Role })}
                  disabled={user.role === "admin" && user.id === 1}
                  className="h-10 rounded-xl border bg-white px-3 text-sm font-semibold"
                >
                  <option value="admin">مدير النظام</option>
                  <option value="supervisor">مشرف</option>
                  <option value="sales">سيلز</option>
                </select>

                <button
                  type="button"
                  onClick={() => updateUser(user, { is_active: !user.is_active })}
                  disabled={user.role === "admin" && user.id === 1}
                  className={`h-10 rounded-xl border px-4 text-sm font-bold transition-colors ${
                    user.is_active
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-100 text-gray-500"
                  }`}
                >
                  {user.is_active ? "نشط" : "موقوف"}
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>إضافة مستخدم</CardTitle>
                <CardDescription className="mt-2">أدخل بيانات عضو الفريق وحدد دوره.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">الاسم</label>
                  <Input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="اسم الموظف"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="user@atelier.local"
                    dir="ltr"
                    className="h-11 rounded-xl text-left"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">الدور والصلاحية</label>
                  <select
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
                    className="h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold"
                  >
                    <option value="sales">سيلز</option>
                    <option value="supervisor">مشرف</option>
                    <option value="admin">مدير النظام</option>
                  </select>
                </div>
                <Button type="submit" disabled={saving} className="h-11 w-full rounded-xl">
                  {saving ? "جاري الحفظ..." : "إضافة المستخدم"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
