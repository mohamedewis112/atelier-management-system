"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dressesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { X, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { clearSharedUploadPayload, getSharedUploadPayload, base64ToFile, readImageFileAsBase64 } from "@/lib/shared-upload";
import { reportClientError } from "@/lib/error-reporter";

export default function NewDressPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        base_price: "",
        status: "available",
        intended_use: "" as "" | "rental" | "sale",
        photo_url: "",
        thumbnail_url: "",
        notes: "",
    });

    useEffect(() => {
        // Check for shared image payload from Android app
        const sharedPayload = getSharedUploadPayload();
        if (sharedPayload && sharedPayload.base64) {
            const uploadSharedImage = async () => {
                setSaving(true);
                try {
                    const file = base64ToFile(sharedPayload.base64, sharedPayload.fileName, sharedPayload.mimeType);
                    const res = await dressesApi.uploadImage(file);
                    if (res.success && res.data) {
                        setFormData(prev => ({
                            ...prev,
                            photo_url: res.data!.imageUrl,
                            thumbnail_url: res.data!.thumbnailUrl,
                        }));
                        clearSharedUploadPayload();
                        toast({ title: "تم استلام الصورة", description: "تم تحميل صورة القطعة بنجاح إلى النموذج" });
                    }
                } catch (error) {
                    toast({ title: "خطأ", description: "فشل تحميل الصورة من المشاركة", variant: "destructive" });
                } finally {
                    setSaving(false);
                }
            };
            uploadSharedImage();
        }
    }, [toast]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Some Android devices return an empty file.type when selecting from the
        // gallery through a capture="environment" input. Fall back to extension.
        let mimeType = file.type;
        if (!mimeType) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            const extMap: Record<string, string> = {
                jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
                gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
                heic: 'image/heic', heif: 'image/heif',
            };
            mimeType = extMap[ext] || '';
        }

        if (!mimeType.startsWith("image/")) {
            toast({ title: "خطأ", description: "يمكن تحميل ملفات الصور فقط", variant: "destructive" });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast({ title: "خطأ", description: "الملف كبير جدًا (الحد الأقصى 10MB)", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            // Use canvas-based image loading to bypass broken FileReader on some Android Chrome builds (HyperOS observed).
            // On devices like Poco M7 Pro, capture="environment" files are MediaStore
            // content URIs that Chrome's JS file APIs cannot read reliably. Loading via
            // new Image() uses Chrome's native decode pipeline which works correctly.
            const base64 = await readImageFileAsBase64(file);
            const res = await dressesApi.uploadImageBase64(base64);
            if (res.success && res.data) {
                setFormData(prev => ({
                    ...prev,
                    photo_url: res.data!.imageUrl,
                    thumbnail_url: res.data!.thumbnailUrl
                }));
                toast({ title: "تم بنجاح", description: "تم تحميل الصورة بنجاح" });
            }
        } catch (error) {
            toast({ title: "خطأ", description: "فشل تحميل الصورة", variant: "destructive" });
            reportClientError({
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                component: 'NewDress',
                action: 'تحميل صورة القطعة'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast({ title: "خطأ", description: "الرجاء إدخال اسم اللباس", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const data = {
                name: formData.name,
                base_price: parseFloat(formData.base_price) || 0,
                status: formData.status,
                intended_use: formData.intended_use || null,
                photo_url: formData.photo_url || undefined,
                thumbnail_url: formData.thumbnail_url || undefined,
                notes: formData.notes || undefined,
            };

            await dressesApi.create(data);
            toast({ title: "تم بنجاح", description: "تمت إضافة القطعة بنجاح" });
            router.push("/dashboard/dresses");
        } catch (error) {
            const message = error instanceof Error ? error.message : "حدث خطأ أثناء حفظ القطعة";
            toast({
                title: "خطأ",
                description: message,
                variant: "destructive",
            });
            reportClientError({
                message,
                stack: error instanceof Error ? error.stack : undefined,
                component: 'NewDress',
                action: 'إنقاذ ثوب جديد'
            });
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/dashboard/dresses")}
                    className="rounded-full bg-white shadow-sm hover:bg-gray-100"
                >
                    <ArrowRight className="h-5 w-5" />
                </Button>
                <h1 className="text-2xl font-black">وأضاف قطعة جديد</h1>
            </div>

            <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
                <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">اسم القطعة *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="h-14 rounded-2xl bg-muted/30 border-transparent focus:bg-white transition-all text-lg"
                                placeholder="على سبيل المثال: قطعة ذهبي لامع"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">السعر الأساسي</label>
                                <Input
                                    type="number"
                                    step="1"
                                    value={formData.base_price}
                                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === '.' || e.key === '-') e.preventDefault();
                                    }}
                                    className="h-14 rounded-2xl bg-muted/30 border-transparent"
                                    placeholder="ج.م"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">الحالة</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full h-14 px-4 rounded-2xl bg-muted/30 border-none outline-none text-sm font-bold"
                                >
                                    <option value="available">حر</option>
                                    <option value="sold">مُباع</option>
                                    <option value="retired">إنتهى من المخزن</option>
                                    <option value="custom_sewing">الخياطة الشخصية</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">تسمية اللباس</label>
                            <select
                                value={formData.intended_use}
                                onChange={(e) => setFormData({ ...formData, intended_use: e.target.value as "" | "rental" | "sale" })}
                                className="w-full h-14 px-4 rounded-2xl bg-muted/30 border-none outline-none text-sm font-bold"
                            >
                                <option value="">بدون تسمية</option>
                                <option value="rental">مخصصة للإيجار</option>
                                <option value="sale">مخصصة للبيع</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">صورة القطعة</label>
                            <div className="flex flex-col gap-4">
                                {formData.photo_url ? (
                                    <div className="relative h-64 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted/30 group">
                                        <img
                                            src={formData.photo_url || ""}
                                            alt="معاينة"
                                            className="w-full h-full object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, photo_url: "", thumbnail_url: "" }))}
                                            className="absolute top-2 left-2 h-10 w-10 bg-black/50 text-white rounded-full flex items-center justify-center opacity-100 transition-opacity shadow-lg"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="h-40 w-full rounded-2xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-all">
                                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                            <Plus className="h-6 w-6" />
                                        </div>
                                        <span className="text-sm font-bold text-muted-foreground">انقر لتحميل الصورة</span>
                                        <span className="text-[10px] text-muted-foreground/60 uppercase font-black">JPG, PNG, WEBP (الأعلى' 10MB)</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*,application/pdf"
                                            capture="environment"
                                            onChange={handleFileUpload}
                                            disabled={saving}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">ملاحظات</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full h-32 p-4 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-inner"
                                placeholder="أبعاد, نوع القماش, أبرز الخاصة..."
                            />
                        </div>

                        <div className="flex gap-4 pt-4 pb-8">
                            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/dresses")} className="flex-1 h-14 rounded-2xl font-bold">
                                إلغاء
                            </Button>
                            <Button type="submit" disabled={saving} className="flex-1 h-14 rounded-2xl font-bold shadow-lg shadow-primary/20">
                                {saving ? "جاري التحميل..." : "حفظ اللباس"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
