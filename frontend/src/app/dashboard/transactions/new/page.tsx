"use client";

/**
 * New Transaction Page
 * 
 * Purpose: A dedicated page for adding income/expenses.
 * Optimized for full-screen usage on both desktop and mobile.
 * Features: Quick selection from recent orders, intelligent field visibility.
 * Language: Feminine.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Wallet,
  User,
  Calendar,
  Tag,
  CreditCard,
  Camera,
  X,
  ShoppingBag,
  Plus,
  Search,
  Check,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { transactionsApi, customersApi, ordersApi } from "@/lib/api";
import { cn, getCategoryLabel, normalizePhoneInput, formatDateInput } from "@/lib/utils";
import { clearSharedUploadPayload, getSharedUploadPayload, compressImageForUpload } from "@/lib/shared-upload";
import { reportClientError } from "@/lib/error-reporter";
import { ContactPicker } from "@/components/dashboard/contact-picker";

const FORM_INCOME_CATEGORIES = [
  { value: "existing_order", label: "حجز" },
  { value: "repair", label: "إصلاحات" },
  { value: "other", label: "أخرى" },
];

const EXPENSE_CATEGORIES = [
  { value: "materials", label: "خامات" },
  { value: "overhead", label: "مصروفات تشغيل" },
  { value: "tax", label: "الضرائب" },
  { value: "equipment", label: "معدات" },
  { value: "salary", label: "الرواتب" },
  { value: "other", label: "أخرى" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bit", label: "محفظة إلكترونية" },
  { value: "paybox", label: "محفظة إلكترونية" },
  { value: "credit", label: "بطاقة بنكية" },
  { value: "transfer", label: "تحويل بنكي" },
  { value: "check", label: "شيك" },
];

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<"income" | "expense">("income");
  const [uiCategory, setUiCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerDetails, setNewCustomerDetails] = useState({ name: "", phone: "", email: "" });

  const [orderId, setOrderId] = useState("");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [expenseAllocation, setExpenseAllocation] = useState<"business" | "customer" | "split">("business");
  const [customerChargeAmount, setCustomerChargeAmount] = useState("");

  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");

  // Payment Details State
  const [bankNumber, setBankNumber] = useState("");
  const [branchNumber, setBranchNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  const [installments, setInstallments] = useState("1");
  const sharedAppliedRef = useRef(false);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "expense") setType("expense");

    const amountParam = searchParams.get("amount");
    if (amountParam) setAmount(amountParam);

    const custIdParam = searchParams.get("customer_id");
    if (custIdParam) setCustomerId(custIdParam);

    const orderIdParam = searchParams.get("order_id");
    if (orderIdParam) {
      setOrderId(orderIdParam);
      setUiCategory("existing_order");
      setCategory("order");
    }
  }, [searchParams]);

  useEffect(() => {
    if (sharedAppliedRef.current) return;

    const sharedUpload = searchParams.get("shared_upload");
    if (sharedUpload !== "1") return;

    const payload = getSharedUploadPayload();
    if (!payload) return;

    setFileBase64(payload.base64);
    setFileName(payload.fileName);

    const shareContext = searchParams.get("share_context");
    if (shareContext === "transaction_income") {
      setType("income");
    }
    if (shareContext === "transaction_expense") {
      setType("expense");
    }
    setPaymentMethod((prev) => (prev === "cash" ? "" : prev));

    clearSharedUploadPayload();
    sharedAppliedRef.current = true;
    toast({ title: "تم إرفاق الملف", description: "تم إرفاق المستند بالحركة الحالية." });
  }, [searchParams, toast]);

  useEffect(() => {
    const loadData = async () => {
      if (type === "income" && uiCategory === "existing_order") {
        const res = await ordersApi.list({ limit: 50, sortBy: 'event_date', sortOrder: 'desc' } as any);
        if (res.success) setRecentOrders((res.data as any).orders || []);
      } else if (type === "expense" && (expenseAllocation === "customer" || expenseAllocation === "split")) {
        const res = await ordersApi.list({ limit: 50, sortBy: 'event_date', sortOrder: 'desc' } as any);
        if (res.success) setRecentOrders((res.data as any).orders || []);
      }
    };
    loadData();
  }, [type, uiCategory, expenseAllocation]);

  useEffect(() => {
    if (customerSearch.length > 1) {
      const timer = setTimeout(async () => {
        try {
          const res = await customersApi.list({ search: customerSearch, limit: 1000 });
          if (res.success && res.data) {
            setCustomers((res.data as any).customers);
          }
        } catch (e) {
          console.error(e);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [customerSearch]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Raw file size check — PDFs are passed through as-is; images are compressed
    // via canvas below, so only block truly huge files (>20MB raw).
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "الملف كبير جدًا", description: "الحد الأقصى لحجم الملف 20MB. جرّب رفع صورة بدقة أقل.", variant: "destructive" });
      return;
    }

    try {
      // Compress images via canvas to avoid exceeding server body-size limits.
      // Camera photos (8-12MB) become ~200-400KB after resize + JPEG compression.
      // PDFs pass through unmodified inside compressImageForUpload.
      const base64 = await compressImageForUpload(file);
      setFileBase64(base64);
      setFileName(file.name);
    } catch (err) {
      console.error('File read/compress error:', err);
      toast({ title: "خطأ في قراءة الملف", description: "تعذر قراءة الملف. جرّب رفع ملف آخر.", variant: "destructive" });
      reportClientError({
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        component: 'NewTransaction',
        action: 'قراءة المستند المرفق'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Specific validation with distinct error messages ---
    if (!amount) {
      toast({ title: "المبلغ مطلوب", description: "أدخل مبلغ الحركة المالية.", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "طريقة الدفع مطلوبة", description: "اختر طريقة الدفع.", variant: "destructive" });
      return;
    }
    if (type === "income" && !uiCategory) {
      toast({ title: "نوع الإيراد مطلوب", description: "اختر نوع الإيراد: حجز، إصلاحات، أو أخرى.", variant: "destructive" });
      return;
    }
    if (type === "expense" && !category) {
      toast({ title: "التصنيف مطلوب", description: "الرجاء تحديد فئة للنشر (خامات, مصروفات تشغيل الخ').", variant: "destructive" });
      return;
    }
    if (type === "income" && !customerId && !isNewCustomer) {
      toast({ title: "العميل مطلوب", description: "ابحث عن عميل حالي واختره، أو أضف عميلًا جديدًا.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        type,
        amount: parseFloat(amount),
        category: type === "income" ? category : category,
        date,
        supplier: type === "expense" ? supplier : undefined,
        product: type === "expense" ? product : undefined,
        payment_method: paymentMethod || undefined,
        notes: notes || undefined,
        confirmation_number: confirmationNumber || undefined,
        check_number: checkNumber || undefined,
        last_four_digits: lastFourDigits || undefined,
        installments: installments ? parseInt(installments) : 1,
        bank_details: (bankNumber || branchNumber || accountNumber) ?
          JSON.stringify({ bank: bankNumber, branch: branchNumber, account: accountNumber }) : undefined,
        customer_id: customerId ? parseInt(customerId) : undefined,
        order_id: orderId ? parseInt(orderId) : undefined,
        fileBase64,
        fileName,
        customer_charge_amount: type === 'expense' && expenseAllocation !== 'business'
          ? (expenseAllocation === 'customer' ? parseFloat(amount) : parseFloat(customerChargeAmount || '0'))
          : 0,
      };

      if (isNewCustomer) {
        if (!newCustomerDetails.name.trim()) {
          toast({ title: "اسم العميل مطلوب", description: "أدخل اسم العميل الجديد.", variant: "destructive" });
          setSaving(false);
          return;
        }
        data.new_customer = newCustomerDetails;
        delete data.customer_id;
      }

      await transactionsApi.create(data);
      toast({ title: "تم بنجاح!", description: "تم تسجيل الحركة المالية بنجاح" });
      router.push("/dashboard/transactions");
    } catch (error) {
      // Show the server's specific error message when available,
      // or a generic fallback if no message is present.
      const message = error instanceof Error && error.message
        ? error.message
        : "تعذر حفظ الحركة المالية. تحقق من الاتصال وحاول مرة أخرى.";
      toast({ title: "تعذر الحفظ", description: message, variant: "destructive" });
      reportClientError({
        message,
        stack: error instanceof Error ? error.stack : undefined,
        component: 'NewTransaction',
        action: 'حفظ الحركة'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-md border-b px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ArrowRight className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-black">حركة جديدة</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-3 sm:p-5 pt-3 space-y-4">

        {/* Type Selector */}
        <div className="bg-muted p-1 rounded-2xl flex relative overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-all duration-300 ease-spring",
              type === "expense" ? "translate-x-0" : "translate-x-[calc(100%+4px)]"
            )}
          />
          <button
            type="button"
            onClick={() => setType("expense")}
            className={cn(
              "flex-1 py-2.5 text-sm font-black z-10 transition-colors text-center rounded-xl",
              type === "expense" ? "text-red-600" : "text-muted-foreground"
            )}
          >
            مصروف
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={cn(
              "flex-1 py-2.5 text-sm font-black z-10 transition-colors text-center rounded-xl",
              type === "income" ? "text-green-600" : "text-muted-foreground"
            )}
          >
            إيراد
          </button>
        </div>

        {/* Amount Input */}
        <div className="text-center py-1">
          <label className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-0.5 block">المبلغ بالجنيه المصري</label>
          <div className="relative inline-block w-full max-w-[240px]">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === '.' || e.key === '-') e.preventDefault();
              }}
              className="text-5xl font-black text-center bg-transparent border-none focus:outline-none w-full placeholder:text-muted/20"
              autoFocus
            />
            <span className="absolute -right-5 top-1 text-2xl text-muted-foreground font-light">ج.م</span>
          </div>
        </div>

        {/* Date row (compact) */}
        <div className="flex items-center gap-2 w-fit">
          <label className="text-xs font-bold text-muted-foreground flex items-center gap-1 whitespace-nowrap">
            <Calendar className="h-3 w-3" /> التاريخ
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-xl border-2 text-sm w-[160px]"
          />
        </div>

        {/* Income Flow */}
        {type === "income" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ما هو نوع الدخل؟? *</label>
              <div className="grid grid-cols-3 gap-2">
                {FORM_INCOME_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setUiCategory(cat.value);
                      if (cat.value === 'repair' || cat.value === 'other') setCategory(cat.value);
                      else setCategory("");
                      setOrderId("");
                      setCustomerId("");
                    }}
                    className={cn(
                      "py-2.5 px-1 text-xs font-bold rounded-xl border-2 transition-all",
                      uiCategory === cat.value ? "bg-primary text-white border-primary shadow-lg" : "bg-background hover:bg-muted"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {uiCategory === "existing_order" && !orderId && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-primary flex items-center gap-1"><Search className="h-3 w-3" /> حدد الطلب</label>
                <div className="grid gap-2 max-h-60 overflow-y-auto p-1 bg-muted/20 rounded-2xl border-2">
                  {recentOrders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setOrderId(order.id.toString());
                        setCustomerId(order.customer_id.toString());
                        setCategory('order');
                        setCustomerSearch(order.customer_name);
                      }}
                      className="w-full text-right p-4 bg-card border-2 rounded-xl hover:border-primary transition-all shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-black text-primary">{order.customer_name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">#{order.id}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">{order.order_summary || 'حجز'}</span>
                        <span className="text-xs font-bold text-green-600">
                          توازن: ج.م{(order.total_price || 0) + (order.total_customer_charge || 0) - (order.paid_amount || 0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {orderId && (
              <Card className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-full"><ShoppingBag className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">المرتبطة بالأمر #{orderId}</p>
                    <p className="text-lg font-black">{customerSearch}</p>

                    {/* Add remaining balance indication explicitly here */}
                    {(() => {
                      const order = recentOrders.find(o => o.id.toString() === orderId);
                      if (!order) return null;
                      const balance = (order.total_price || 0) + (order.total_customer_charge || 0) - (order.paid_amount || 0);
                      return (
                        <p className="text-xs font-bold text-green-700 mt-1 flex items-center gap-1">
                          <Wallet className="h-3 w-3" /> الديون الحالية على النظام: ج.م{balance}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => { setOrderId(""); setCategory(""); }} className="text-destructive"><X /></Button>
              </Card>
            )}

            {(uiCategory === "repair" || uiCategory === "other") && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">من هو العميل؟?</label>

                {isNewCustomer ? (
                  <div className="bg-primary/5 p-4 rounded-2xl border-2 border-primary/20 space-y-3 animate-in zoom-in-95">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-primary flex items-center gap-2">
                        <User className="h-4 w-4" /> تفاصيل العميل الجديد
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsNewCustomer(false)}
                        className="h-8 w-8 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <ContactPicker
                        onContactSelect={(contact) => {
                          setNewCustomerDetails({
                            name: contact.name,
                            phone: normalizePhoneInput(contact.phone),
                            email: contact.email
                          });
                        }}
                        className="rounded-xl h-8 text-xs border-primary text-primary hover:bg-primary/10"
                        label="استيراد من جهات الاتصال"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">الاسم الكامل</label>
                        <Input
                          value={newCustomerDetails.name}
                          onChange={(e) => setNewCustomerDetails({ ...newCustomerDetails, name: e.target.value })}
                          className="bg-white"
                          placeholder="اسم العميل"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">الهاتف</label>
                        <Input
                          value={newCustomerDetails.phone}
                          onChange={(e) => setNewCustomerDetails({ ...newCustomerDetails, phone: normalizePhoneInput(e.target.value) })}
                          className="bg-white text-left"
                          placeholder="050-0000000"
                          dir="ltr"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">البريد الإلكتروني (خياري)</label>
                        <Input
                          value={newCustomerDetails.email}
                          onChange={(e) => setNewCustomerDetails({ ...newCustomerDetails, email: e.target.value })}
                          className="bg-white text-left"
                          placeholder="email@example.com"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن عميل..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pr-10 h-12 rounded-xl border-2"
                    />
                  </div>
                )}

                {!isNewCustomer && (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(c.id.toString());
                          setCustomerSearch(c.name);
                          setIsNewCustomer(false);
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border-2 text-right transition-all",
                          customerId === c.id.toString() && !isNewCustomer ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                        )}
                      >
                        <span className="font-bold">{c.name}</span>
                        {customerId === c.id.toString() && !isNewCustomer && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                    {customerSearch.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomer(true);
                          setNewCustomerDetails({ name: customerSearch, phone: "", email: "" });
                          setCustomerId("");
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border-2 border-dashed text-right transition-all",
                          "border-muted-foreground/30 hover:border-primary hover:text-primary"
                        )}
                      >
                        <span className="font-bold flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          خلق عميل جديد: "{customerSearch}"
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expense Flow */}
        {type === "expense" && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">مزود / محل</label>
                <Input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="اسم المورد"
                  className="focus:border-red-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">منتج / خدمة</label>
                <Input
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="تفاصيل المصروف"
                  className="focus:border-red-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">فئة *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-xl border-2 bg-background px-3 font-bold text-sm"
              >
                <option value="">اختر فئة...</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="bg-muted p-1 rounded-2xl flex gap-1">
              {[
                { id: "business", label: "على النشاط" },
                { id: "customer", label: "عميل" },
                { id: "split", label: "مقسّم" }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExpenseAllocation(opt.id as any)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-xl transition-all",
                    expenseAllocation === opt.id ? "bg-white shadow text-primary" : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {expenseAllocation !== "business" && (
              <Card className="border-2 border-red-100 bg-red-50/30 p-4 rounded-2xl space-y-4">
                <label className="text-xs font-bold text-red-700 uppercase">جمعية لتوجيه الاتهام</label>
                {!orderId ? (
                  <div className="grid gap-2 max-h-40 overflow-y-auto">
                    {recentOrders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => { setOrderId(o.id.toString()); setCustomerId(o.customer_id.toString()); setCustomerSearch(o.customer_name); }}
                        className="p-3 bg-white border-2 rounded-xl text-right hover:border-red-300 transition-all flex justify-between"
                      >
                        <div>
                          <p className="font-bold text-red-600 text-sm">{o.customer_name}</p>
                          <p className="text-[10px] text-muted-foreground">حجز #{o.id}</p>
                        </div>
                        <div className="text-left flex flex-col items-end">
                          <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                            ج.م{(o.total_price || 0) + (o.total_customer_charge || 0) - (o.paid_amount || 0)} قصير
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-xl border-2 border-red-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-red-600">حجز #{orderId}</p>
                      <p className="font-bold">{customerSearch}</p>
                      {(() => {
                        const order = recentOrders.find(o => o.id.toString() === orderId);
                        if (!order) return null;
                        const balance = (order.total_price || 0) + (order.total_customer_charge || 0) - (order.paid_amount || 0);
                        return (
                          <p className="text-[10px] font-bold text-red-700 mt-1 flex items-center gap-1">
                            <Wallet className="h-3 w-3" /> الديون الحالية: ج.م{balance}
                          </p>
                        );
                      })()}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setOrderId(""); setCustomerId(""); }} className="text-red-600"><X /></Button>
                  </div>
                )}
                {expenseAllocation === "split" && (
                  <Input
                    type="number"
                    value={customerChargeAmount}
                    onChange={(e) => setCustomerChargeAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === '.' || e.key === '-') e.preventDefault();
                    }}
                    placeholder="المبلغ المحمّل على العميل"
                    className="h-11 rounded-xl border-2"
                  />
                )}
              </Card>
            )}
          </div>
        )}

        {/* Global Fields */}
        <section className="space-y-3">

          {/* Payment method (right half) + primary reference field (left half) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-10 rounded-xl border-2 bg-background px-3 text-sm font-bold"
              >
                <option value="" disabled>اختر طريقة الدفع...</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              {paymentMethod === "cash" ? null : paymentMethod === "check" ? (
                <>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">رقم شيك</label>
                  <Input value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} className="h-10" />
                </>
              ) : (
                <>
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">مرجع</label>
                  <Input value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} placeholder="رقم المرجع..." className="h-10" />
                </>
              )}
            </div>
          </div>

          {/* Extra payment detail row — shown only when relevant */}
          {paymentMethod === "credit" && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">4 الأدب</label>
                <Input
                  value={lastFourDigits}
                  onChange={(e) => setLastFourDigits(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="h-9 text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">دفعات</label>
                <Input
                  type="number"
                  min="1"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="h-9 text-center"
                />
              </div>
            </div>
          )}

          {(paymentMethod === "transfer" || paymentMethod === "check") && (
            <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">رقم البنك</label>
                <Input value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} className="h-9 text-center" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">رقم الفرع</label>
                <Input value={branchNumber} onChange={(e) => setBranchNumber(e.target.value)} className="h-9 text-center" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">رقم الحساب</label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-9 text-center" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              className="w-full h-20 p-3 rounded-2xl border-2 bg-background focus:border-primary outline-none resize-none shadow-inner"
            />
          </div>

          {/* File upload: always visible for expenses (receipt), hidden for cash income */}
          {(type === "expense" || paymentMethod !== "cash") && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                <Camera className="h-3 w-3" /> {type === "expense" ? "صورة الإيصال" : "إيصال أو مستند"}
              </label>
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed transition-all cursor-pointer",
                fileName ? "bg-green-50 border-green-300 text-green-700" : "bg-muted/20 hover:bg-muted/40 text-muted-foreground"
              )}>
                {fileName ? <Check className="h-6 w-6 mb-1" /> : <Upload className="h-6 w-6 mb-1" />}
                <span className="font-bold text-sm">{fileName || "اضغط لرفع صورة أو ملف"}</span>
                <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}
        </section>

      </form>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl text-lg font-bold border-2"
            onClick={() => router.back()}
          >
            إلغاء
          </Button>
          <Button
            className={cn(
              "flex-[2] h-14 rounded-2xl text-lg font-bold shadow-xl transition-all",
              type === "income" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            )}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : "حفظ الحركة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
