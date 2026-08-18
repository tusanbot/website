"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ServiceFormBuilder, { FormField } from "@/components/ServiceFormBuilder";
import {
    GlassPanel,
    TusanCard,
    TusanButton,
    TusanInput,
    SectionHeader,
} from "@/components/ui";

type ParentForm = {
    id: string;
    title: string;
    description: string | null;
    service_id: string;
    service_title: string;
};

export default function NewServicePage() {
    const router = useRouter();

    // Two explicit workflows:
    // 1) Create a new service + its parent form + first child form.
    // 2) Create a child form under an already existing parent.
    const [mode, setMode] = useState<"new-parent" | "existing-parent">("new-parent");

    // Service data is only relevant when creating a new parent/service.
    const [serviceTitle, setServiceTitle] = useState("");
    const [category, setCategory] = useState("");
    const [serviceDescription, setServiceDescription] = useState("");
    const [price, setPrice] = useState("");
    const [icon, setIcon] = useState("");
    const [isActive, setIsActive] = useState(true);

    // Parent data for a new service.
    const [parentTitle, setParentTitle] = useState("");
    const [parentDescription, setParentDescription] = useState("");

    // Child data.
    const [childTitle, setChildTitle] = useState("");
    const [childDescription, setChildDescription] = useState("");
    const [childSchema, setChildSchema] = useState<FormField[]>([]);

    const [parentForms, setParentForms] = useState<ParentForm[]>([]);
    const [selectedParentId, setSelectedParentId] = useState("");
    const [loadingParents, setLoadingParents] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadParentForms();
    }, []);

    async function loadParentForms() {
        setLoadingParents(true);
        setError("");

        try {
            const { data, error: formsError } = await supabase
                .from("custom_forms")
                .select("id,title,description,service_id,services(title)")
                .eq("form_type", "parent")
                .is("parent_form_id", null)
                .eq("is_public", true)
                .order("created_at", { ascending: false });

            if (formsError) throw new Error(formsError.message);

            setParentForms(
                (data || []).map((row: any) => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    service_id: row.service_id,
                    service_title: row.services?.title || row.title,
                }))
            );
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "دریافت فهرست فرم‌های مادر انجام نشد.");
        } finally {
            setLoadingParents(false);
        }
    }

    async function getAdminUserId() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("برای مدیریت فرم باید وارد حساب کاربری شوید.");

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || profile?.role !== "admin") {
            throw new Error("دسترسی مدیریت فرم‌ها فقط برای مدیر مجاز است.");
        }

        return user.id;
    }

    async function createNewParentFlow(userId: string) {
        if (!serviceTitle.trim()) {
            throw new Error("عنوان خدمت را وارد کنید.");
        }

        if (!parentTitle.trim()) {
            throw new Error("عنوان فرم مادر را وارد کنید.");
        }

        if (!childTitle.trim()) {
            throw new Error("عنوان فرم فرزند را وارد کنید.");
        }

        // The service represents the top-level customer-facing entry.
        // Therefore its title is intentionally the same as the parent form title.
        const { data: service, error: serviceError } = await supabase
            .from("services")
            .insert({
                title: parentTitle.trim(),
                category: category.trim() || null,
                description: serviceDescription.trim() || null,
                price: price ? Number(price) : 0,
                icon: icon.trim() || null,
                is_active: isActive,
                form_schema: [],
            })
            .select("id,title")
            .single();

        if (serviceError || !service) {
            throw new Error(serviceError?.message || "خدمت ایجاد نشد.");
        }

        // FIRST create the real parent using the parent title entered by the admin.
        const { data: parent, error: parentError } = await supabase
            .from("custom_forms")
            .insert({
                title: parentTitle.trim(),
                description: parentDescription.trim() || null,
                schema: [],
                created_by: userId,
                is_public: true,
                form_type: "parent",
                parent_form_id: null,
                service_id: service.id,
                sort_order: 0,
            })
            .select("id")
            .single();

        if (parentError || !parent) {
            // Avoid leaving an orphan service if parent creation fails.
            await supabase.from("services").delete().eq("id", service.id);
            throw new Error(parentError?.message || "فرم مادر ایجاد نشد.");
        }

        // THEN create the actual child under that parent.
        const { error: childError } = await supabase
            .from("custom_forms")
            .insert({
                title: childTitle.trim(),
                description: childDescription.trim() || null,
                schema: childSchema,
                created_by: userId,
                is_public: true,
                form_type: "normal",
                parent_form_id: parent.id,
                service_id: service.id,
                sort_order: 0,
            });

        if (childError) {
            await supabase.from("custom_forms").delete().eq("id", parent.id);
            await supabase.from("services").delete().eq("id", service.id);
            throw new Error(childError.message);
        }
    }

    async function createChildForExistingParent(userId: string) {
        if (!selectedParentId) {
            throw new Error("یک فرم مادر را انتخاب کنید.");
        }

        if (!childTitle.trim()) {
            throw new Error("عنوان فرم فرزند را وارد کنید.");
        }

        // Never create another service here. The selected parent already belongs
        // to the correct customer-facing service.
        const selectedParent = parentForms.find((item) => item.id === selectedParentId);
        if (!selectedParent) {
            throw new Error("فرم مادر انتخاب‌شده پیدا نشد. فهرست را دوباره بارگذاری کنید.");
        }

        const { data: existingChild, error: existingChildError } = await supabase
            .from("custom_forms")
            .select("id")
            .eq("parent_form_id", selectedParent.id)
            .eq("service_id", selectedParent.service_id)
            .eq("form_type", "normal")
            .eq("title", childTitle.trim())
            .maybeSingle();

        if (existingChildError) throw new Error(existingChildError.message);
        if (existingChild) {
            throw new Error("فرمی با همین عنوان زیر این فرم مادر قبلاً وجود دارد.");
        }

        const { data: siblings } = await supabase
            .from("custom_forms")
            .select("sort_order")
            .eq("parent_form_id", selectedParent.id)
            .eq("form_type", "normal");

        const nextSortOrder = (siblings || []).reduce(
            (max: number, item: any) => Math.max(max, Number(item.sort_order || 0)),
            -1
        ) + 1;

        const { error: childError } = await supabase
            .from("custom_forms")
            .insert({
                title: childTitle.trim(),
                description: childDescription.trim() || null,
                schema: childSchema,
                created_by: userId,
                is_public: true,
                form_type: "normal",
                parent_form_id: selectedParent.id,
                service_id: selectedParent.service_id,
                sort_order: nextSortOrder,
            });

        if (childError) throw new Error(childError.message);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const userId = await getAdminUserId();

            if (mode === "new-parent") {
                await createNewParentFlow(userId);
            } else {
                await createChildForExistingParent(userId);
            }

            router.push("/admin/services");
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "خطایی هنگام ایجاد فرم رخ داد.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen page-background p-6 text-[var(--text)]">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <SectionHeader
                        title="ایجاد فرم و خدمت"
                        description="فرم مادر، فرم فرزند و ارتباط آن‌ها را به‌صورت صحیح مدیریت کنید."
                    />
                    <Link href="/admin/services">
                        <TusanButton variant="secondary">بازگشت</TusanButton>
                    </Link>
                </div>

                <GlassPanel className="p-6">
                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("new-parent");
                                setError("");
                            }}
                            className={`rounded-2xl border p-4 text-right transition ${mode === "new-parent" ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-gray-200 hover:border-[#09967C]/50"}`}
                        >
                            <div className="font-bold">ایجاد فرم مادر جدید</div>
                            <div className="text-sm text-gray-500 mt-1">یک خدمت جدید + فرم مادر + اولین فرم فرزند</div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setMode("existing-parent");
                                setError("");
                                if (parentForms.length === 0) loadParentForms();
                            }}
                            className={`rounded-2xl border p-4 text-right transition ${mode === "existing-parent" ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-gray-200 hover:border-[#09967C]/50"}`}
                        >
                            <div className="font-bold">افزودن فرم فرزند</div>
                            <div className="text-sm text-gray-500 mt-1">انتخاب یک فرم مادر موجود و ساخت فرزند زیر آن</div>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === "new-parent" ? (
                            <>
                                <TusanCard className="p-5 space-y-5">
                                    <div>
                                        <h3 className="font-bold text-lg">فرم مادر و خدمت</h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            عنوانی که اینجا برای فرم مادر وارد می‌کنید، هم به‌عنوان عنوان فرم مادر و هم ورودی اصلی بخش خدمات مشتری استفاده می‌شود.
                                        </p>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-2">عنوان فرم مادر / خدمت</label>
                                            <TusanInput value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="مثلاً ثبت نام خودرو" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-2">دسته‌بندی</label>
                                            <TusanInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="مثلاً خودرو" />
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-2">آیکون</label>
                                            <TusanInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="مثلاً 🚗" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold mb-2">قیمت</label>
                                            <TusanInput type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="مثلاً 150000" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2">توضیحات خدمت</label>
                                        <textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none resize-none" />
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-5 h-5 accent-[#09967C]" />
                                        <span className="font-bold">خدمت فعال باشد</span>
                                    </label>

                                    <div className="border-t pt-5">
                                        <div className="font-bold mb-2">توضیحات فرم مادر</div>
                                        <TusanInput value={parentDescription} onChange={(e) => setParentDescription(e.target.value)} placeholder="مثلاً انتخاب نوع خودروساز" />
                                    </div>
                                </TusanCard>
                            </>
                        ) : (
                            <TusanCard className="p-5 space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-bold text-lg">انتخاب فرم مادر</h3>
                                        <p className="text-sm text-gray-500 mt-1">فرم مادر قبلی را انتخاب کنید؛ خدمت جدید ایجاد نخواهد شد.</p>
                                    </div>
                                    <TusanButton type="button" variant="secondary" onClick={loadParentForms} disabled={loadingParents}>
                                        {loadingParents ? "در حال دریافت..." : "بروزرسانی"}
                                    </TusanButton>
                                </div>

                                {parentForms.length === 0 ? (
                                    <div className="border border-dashed rounded-xl p-6 text-center text-gray-500">
                                        هیچ فرم مادر فعالی پیدا نشد. ابتدا از گزینه «ایجاد فرم مادر جدید» یک فرم مادر بسازید.
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {parentForms.map((parent) => (
                                            <button
                                                key={parent.id}
                                                type="button"
                                                onClick={() => setSelectedParentId(parent.id)}
                                                className={`rounded-xl border p-4 text-right transition ${selectedParentId === parent.id ? "border-[#09967C] bg-[#09967C]/5 ring-2 ring-[#09967C]/20" : "border-gray-200 hover:border-[#09967C]/50"}`}
                                            >
                                                <div className="font-bold">{parent.title}</div>
                                                <div className="text-xs text-gray-500 mt-1">خدمت: {parent.service_title}</div>
                                                {parent.description && <div className="text-sm text-gray-500 mt-2">{parent.description}</div>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </TusanCard>
                        )}

                        <TusanCard className="p-5 space-y-5">
                            <div>
                                <h3 className="font-bold text-lg">فرم فرزند</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    این همان فرمی است که مشتری بعد از انتخاب فرم مادر انتخاب و تکمیل می‌کند.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">عنوان فرم فرزند</label>
                                    <TusanInput value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="مثلاً ثبت نام سایپا" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">توضیحات فرم فرزند</label>
                                    <TusanInput value={childDescription} onChange={(e) => setChildDescription(e.target.value)} placeholder="مثلاً فرم ثبت نام سایپا" />
                                </div>
                            </div>

                            <ServiceFormBuilder value={childSchema} onChange={setChildSchema} />
                        </TusanCard>

                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                                {error}
                            </div>
                        )}

                        <TusanButton type="submit" disabled={saving} fullWidth>
                            {saving
                                ? "در حال ذخیره..."
                                : mode === "new-parent"
                                    ? "ایجاد فرم مادر و فرم فرزند"
                                    : "ایجاد فرم فرزند زیر فرم مادر"}
                        </TusanButton>
                    </form>
                </GlassPanel>
            </div>
        </div>
    );
}
