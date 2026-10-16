"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { exportApi, type ExportDataset, type ExportFilterDefinition } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Check, ChevronDown, Database, Download, Files, Loader2, RotateCcw } from "lucide-react";

const DATASET_COPY: Record<string, { label: string; description: string }> = {
  customers: { label: "العملاء", description: "بيانات العملاء ووسائل التواصل والملاحظات ومصدر الوصول." },
  dresses: { label: "القطع", description: "بيانات القطع والمخزون والحالة ونوع الاستخدام." },
  orders: { label: "الحجوزات", description: "الحجوزات ومواعيد المناسبات وحالة كل حجز." },
  order_items: { label: "تفاصيل الحجوزات", description: "القطع والخدمات المسجلة داخل كل حجز." },
  transactions: { label: "الحركات المالية", description: "الإيرادات والمصروفات وطرق الدفع والارتباط بالحجوزات." },
  dress_history: { label: "سجل القطع", description: "سجل الإيجار والبيع والتفصيل لكل قطعة." },
  agreements: { label: "العقود", description: "العقود الموقعة وبيانات العملاء والحجوزات المرتبطة بها." },
  settings: { label: "إعدادات النظام", description: "إعدادات النظام والقيم التشغيلية المحفوظة." },
  users: { label: "المستخدمون", description: "حسابات المستخدمين والصلاحيات وحالة كل حساب." },
};

const FILTER_LABELS: Record<string, string> = {
  dateFrom: "من تاريخ",
  dateTo: "إلى تاريخ",
  source: "مصدر العميل",
  search: "بحث",
  dressStatus: "حالة القطعة",
  dressIntendedUse: "نوع الاستخدام",
  orderStatus: "حالة الحجز",
  customerId: "رقم العميل",
  itemType: "نوع العملية",
  orderId: "رقم الحجز",
  dressId: "رقم القطعة",
  transactionType: "نوع الحركة",
  transactionCategory: "التصنيف",
  paymentMethod: "طريقة الدفع",
  rentalType: "نوع العملية",
  userRole: "الصلاحية",
  userIsActive: "حالة المستخدم",
};

const OPTION_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  in_progress: "جاري التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  rental: "إيجار",
  sewing_for_rental: "تفصيل للإيجار",
  sewing: "تفصيل",
  sale: "بيع",
  repair: "إصلاحات",
  available: "متاحة",
  sold: "مباعة",
  retired: "خارج الخدمة",
  custom_sewing: "تفصيل خاص",
  income: "إيراد",
  expense: "مصروف",
  order: "حجز",
  materials: "خامات",
  overhead: "مصروفات تشغيل",
  tax: "ضرائب",
  equipment: "معدات",
  salary: "رواتب",
  other: "أخرى",
  cash: "نقدي",
  bit: "محفظة إلكترونية",
  paybox: "محفظة إلكترونية",
  credit: "بطاقة بنكية",
  transfer: "تحويل بنكي",
  check: "شيك",
  admin: "مدير النظام",
  user: "مستخدم",
  "1": "نشط",
  "0": "موقوف",
};

function datasetLabel(dataset: ExportDataset) {
  return DATASET_COPY[dataset.id]?.label || dataset.label;
}

function datasetDescription(dataset: ExportDataset) {
  return DATASET_COPY[dataset.id]?.description || dataset.description;
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function OptionPicker({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-sm font-medium shadow-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-expanded={open}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 left-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border bg-white p-1.5 shadow-2xl">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm transition-colors hover:bg-muted"
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExportPage() {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<ExportDataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId]
  );

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await exportApi.datasets();
      if (!response.success || !response.data) {
        throw new Error("تعذر تحميل أنواع البيانات المتاحة للتصدير.");
      }

      const payload = response.data as { datasets: ExportDataset[] };
      const list = payload.datasets || [];
      setDatasets(list);
      if (list.length > 0) setSelectedDatasetId((prev) => prev || list[0].id);
    } catch (error) {
      toast({
        title: "تعذر تحميل البيانات",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تجهيز شاشة التصدير.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    if (!selectedDataset) return;
    setFilterValues((prev) => {
      const next = { ...prev };
      for (const filter of selectedDataset.filters) {
        if (next[filter.key] === undefined) {
          next[filter.key] = filter.inputType === "checkbox" ? "false" : "";
        }
      }
      return next;
    });
  }, [selectedDataset]);

  const updateFilter = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const collectFilters = (dataset: ExportDataset) => {
    const filters: Record<string, string> = {};
    for (const filter of dataset.filters) {
      const rawValue = filterValues[filter.key];
      if (filter.inputType === "checkbox") {
        if (rawValue === "true") filters[filter.key] = "true";
        continue;
      }
      const normalized = (rawValue || "").trim();
      if (normalized) filters[filter.key] = normalized;
    }
    return filters;
  };

  const exportOneDataset = async (dataset: ExportDataset) => {
    const { blob, fileName } = await exportApi.downloadCsv(dataset.id, collectFilters(dataset));
    triggerDownload(blob, fileName);
  };

  const handleExportSelected = async () => {
    if (!selectedDataset) return;
    setExporting(true);
    try {
      await exportOneDataset(selectedDataset);
      toast({
        title: "تم تنزيل الملف",
        description: `تم تصدير بيانات ${datasetLabel(selectedDataset)} بنجاح.`,
      });
    } catch (error) {
      toast({
        title: "تعذر تصدير الملف",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء ملف التصدير.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (datasets.length === 0) return;
    setExportingAll(true);
    try {
      for (const dataset of datasets) {
        await exportOneDataset(dataset);
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
      toast({
        title: "اكتمل التصدير",
        description: `تم تنزيل ${datasets.length.toLocaleString("ar-EG")} ملفات بيانات.`,
      });
    } catch (error) {
      toast({
        title: "تعذر تصدير جميع البيانات",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء ملفات التصدير.",
        variant: "destructive",
      });
    } finally {
      setExportingAll(false);
    }
  };

  const clearSelectedFilters = () => {
    if (!selectedDataset) return;
    setFilterValues((prev) => {
      const next = { ...prev };
      for (const filter of selectedDataset.filters) {
        next[filter.key] = filter.inputType === "checkbox" ? "false" : "";
      }
      return next;
    });
  };

  const renderFilterInput = (filter: ExportFilterDefinition) => {
    const value = filterValues[filter.key] ?? (filter.inputType === "checkbox" ? "false" : "");

    if (filter.inputType === "select") {
      const options = [
        { value: "", label: "الكل" },
        ...filter.options.map((option) => ({
          value: option.value,
          label: OPTION_LABELS[String(option.value)] || option.label,
        })),
      ];
      return (
        <OptionPicker
          value={value}
          placeholder="اختر"
          options={options}
          onChange={(nextValue) => updateFilter(filter.key, nextValue)}
        />
      );
    }

    if (filter.inputType === "checkbox") {
      return (
        <label className="flex h-11 items-center gap-3 rounded-xl border bg-white px-4">
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => updateFilter(filter.key, e.target.checked ? "true" : "false")}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-medium">تفعيل هذا الخيار</span>
        </label>
      );
    }

    return (
      <Input
        type={filter.inputType}
        value={value}
        onChange={(e) => updateFilter(filter.key, e.target.value)}
        placeholder={filter.placeholder || "أدخل قيمة الفلتر"}
        className="h-11 rounded-xl bg-white"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const datasetOptions = datasets.map((dataset) => ({
    value: dataset.id,
    label: `${datasetLabel(dataset)} · ${dataset.totalRows.toLocaleString("ar-EG")} سجل`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Database className="h-7 w-7" />
            تصدير البيانات
          </h1>
          <p className="mt-1 text-muted-foreground">
            أنشئ ملفات CSV من بيانات النظام، مع إمكانية اختيار نوع البيانات وتطبيق الفلاتر قبل التنزيل.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportAll}
          disabled={datasets.length === 0 || exportingAll || exporting}
          className="gap-2 rounded-xl"
        >
          {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
          تصدير جميع البيانات
        </Button>
      </div>

      <Card className="overflow-visible">
        <CardHeader>
          <CardTitle>نوع البيانات</CardTitle>
          <CardDescription>حدد القسم الذي تريد استخراج بياناته.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-visible">
          <OptionPicker
            value={selectedDatasetId}
            placeholder="اختر نوع البيانات"
            options={datasetOptions}
            onChange={setSelectedDatasetId}
          />

          {selectedDataset && (
            <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {datasetDescription(selectedDataset)}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDataset && (
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>تصفية البيانات</CardTitle>
            <CardDescription>
              استخدم الفلاتر التالية عند الحاجة، أو اتركها فارغة لتصدير جميع السجلات.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 overflow-visible">
            {selectedDataset.filters.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد فلاتر إضافية لهذا النوع من البيانات.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {selectedDataset.filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <label className="text-sm font-semibold">
                      {FILTER_LABELS[filter.key] || filter.label}
                    </label>
                    {renderFilterInput(filter)}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                onClick={handleExportSelected}
                disabled={exporting || exportingAll}
                className="gap-2 rounded-xl"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                تصدير الملف
              </Button>
              <Button
                variant="outline"
                onClick={clearSelectedFilters}
                disabled={exporting || exportingAll}
                className="gap-2 rounded-xl"
              >
                <RotateCcw className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
