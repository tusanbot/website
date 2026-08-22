"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Printer, Trash2, FileDown, Upload, X } from "lucide-react";

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

type Item = { id: number; title: string; qty: number; price: number; discount: number };

const today = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date());

function money(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.round(value)));
}

export default function InvoiceToolPage() {
  const [seller, setSeller] = useState("کافی‌نت توسن");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [seal, setSeal] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([{ id: 1, title: "", qty: 1, price: 0, discount: 0 }]);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = items.reduce((sum, item) => Math.min(item.qty * item.price, item.discount), 0);
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  }, [items]);

  const updateItem = (id: number, patch: Partial<Item>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const addItem = () => setItems((current) => [...current, { id: Date.now(), title: "", qty: 1, price: 0, discount: 0 }]);
  const removeItem = (id: number) => setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));

  const readImage = (file: File, setter: (value: string | null) => void) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const printInvoice = () => window.print();

  const exportPdf = async () => {
    if (!invoiceRef.current) return;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(invoiceRef.current, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const margin = 8;
      const pageWidth = 210;
      const pageHeight = 297;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const usableHeight = pageHeight - margin * 2;
      let offset = 0;
      let page = 0;

      while (offset < imageHeight - 0.1) {
        if (page > 0) pdf.addPage();
        const sliceHeightMm = Math.min(usableHeight, imageHeight - offset);
        const sourceY = Math.floor((offset / imageHeight) * canvas.height);
        const sourceHeight = Math.max(1, Math.min(canvas.height - sourceY, Math.ceil((sliceHeightMm / imageHeight) * canvas.height)));
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sourceHeight;
        const context = slice.getContext("2d");
        if (!context) throw new Error("Canvas context unavailable");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, slice.width, slice.height);
        context.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        const actualHeight = (sourceHeight * imageWidth) / canvas.width;
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imageWidth, Math.min(actualHeight, usableHeight), undefined, "FAST");
        offset += sliceHeightMm;
        page += 1;
      }

      pdf.save(`invoice-${invoiceNo || "tusan"}.pdf`);
    } catch (error) {
      console.error("Invoice PDF export failed", error);
      window.alert("ساخت فایل PDF انجام نشد. لطفاً دوباره تلاش کنید.");
    }
  };

  return (
    <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-black">فاکتورساز</h1><p className="mt-1 text-sm text-[var(--text-muted)]">ساخت فاکتور فارسی، چاپ و خروجی PDF</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printInvoice} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-bold"><Printer size={18} /> چاپ</button>
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white"><FileDown size={18} /> خروجی PDF</button>
          </div>
        </div>

        <div className="no-print mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-bold">صادرکننده<input value={seller} onChange={(e) => setSeller(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">نام مشتری<input value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">شماره تماس<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">شماره فاکتور<input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal" /></label>
            <label className="text-sm font-bold">تاریخ<input value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal" /></label>
            <div className="text-sm font-bold">لوگو و مهر
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => logoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15} /> {logo ? "تغییر لوگو" : "آپلود لوگو"}</button>
                <button type="button" onClick={() => sealInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15} /> {seal ? "تغییر مهر" : "آپلود مهر"}</button>
                {logo && <button type="button" onClick={() => setLogo(null)} aria-label="حذف لوگو" className="rounded-xl border border-red-200 px-2 py-2 text-red-600"><X size={15} /></button>}
                {seal && <button type="button" onClick={() => setSeal(null)} aria-label="حذف مهر" className="rounded-xl border border-red-200 px-2 py-2 text-red-600"><X size={15} /></button>}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readImage(file, setLogo); e.currentTarget.value = ""; }} />
              <input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readImage(file, setSeal); e.currentTarget.value = ""; }} />
            </div>
          </div>
        </div>

        <div ref={invoiceRef} className="invoice-paper mx-auto bg-white text-slate-900 shadow-xl print:shadow-none">
          <div className="p-6 sm:p-10">
            <div className="flex flex-col gap-5 border-b-2 border-slate-900 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {logo && <img src={logo} alt="لوگو" className="h-16 w-16 object-contain" crossOrigin="anonymous" />}
                <div><h2 className="text-3xl font-black">فاکتور</h2><p className="mt-2 text-lg font-bold">{seller || "—"}</p></div>
              </div>
              <div className="text-sm leading-8"><div>شماره: {invoiceNo || "—"}</div><div>تاریخ: {date || "—"}</div></div>
            </div>
            <div className="my-6 grid gap-2 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><span className="font-bold">مشتری:</span> {customer || "—"}</div><div><span className="font-bold">تماس:</span> {phone || "—"}</div></div>
            <div className="overflow-hidden rounded-2xl border border-slate-300"><table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-100"><th className="border-b border-slate-300 p-3 text-right">شرح</th><th className="border-b border-slate-300 p-3">تعداد</th><th className="border-b border-slate-300 p-3">مبلغ واحد</th><th className="border-b border-slate-300 p-3">تخفیف</th><th className="border-b border-slate-300 p-3">مبلغ</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="border-b border-slate-200 p-2"><input className="w-full bg-transparent p-2 outline-none print:hidden" value={item.title} onChange={(e) => updateItem(item.id, { title: e.target.value })} /><span className="hidden print:inline">{item.title || "—"}</span></td><td className="border-b border-slate-200 p-2 text-center"><input type="number" min="1" className="w-16 bg-transparent p-2 text-center outline-none print:hidden" value={item.qty} onChange={(e) => updateItem(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })} /><span className="hidden print:inline">{money(item.qty)}</span></td><td className="border-b border-slate-200 p-2 text-center"><input type="number" min="0" className="w-28 bg-transparent p-2 text-center outline-none print:hidden" value={item.price} onChange={(e) => updateItem(item.id, { price: Math.max(0, Number(e.target.value) || 0) })} /><span className="hidden print:inline">{money(item.price)}</span></td><td className="border-b border-slate-200 p-2 text-center"><input type="number" min="0" className="w-24 bg-transparent p-2 text-center outline-none print:hidden" value={item.discount} onChange={(e) => updateItem(item.id, { discount: Math.max(0, Number(e.target.value) || 0) })} /><span className="hidden print:inline">{money(item.discount)}</span></td><td className="border-b border-slate-200 p-3 text-center font-bold">{money(Math.max(0, item.qty * item.price - Math.min(item.qty * item.price, item.discount)))}</td></tr>)}</tbody></table></div>
            <div className="no-print mt-3 flex justify-end"><button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--primary)] px-4 py-2 font-bold text-[var(--primary)]"><Plus size={17} /> افزودن ردیف</button>{items.length > 1 && <button type="button" onClick={() => removeItem(items[items.length - 1].id)} className="mr-2 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={17} /> حذف ردیف آخر</button>}</div>
            <div className="mt-6 flex justify-end"><div className="w-full max-w-sm space-y-2 text-sm"><div className="flex justify-between"><span>جمع</span><b>{money(totals.subtotal)}</b></div><div className="flex justify-between"><span>تخفیف</span><b>{money(totals.discount)}</b></div><div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg"><span className="font-black">مبلغ نهایی</span><b>{money(totals.total)}</b></div></div></div>
            <div className="mt-8"><div className="font-bold">توضیحات</div><textarea className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-transparent p-3 outline-none print:hidden" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /><p className="hidden whitespace-pre-wrap print:block">{notes || "—"}</p></div>
            {seal && <div className="mt-6 flex justify-start"><img src={seal} alt="مهر" className="h-24 w-24 object-contain" crossOrigin="anonymous" /></div>}
            <footer className="invoice-footer mt-12 border-t border-slate-300 pt-4 text-center text-xs text-slate-500">فاکتور ساز رایگان توسن · <span dir="ltr">{SITE_URL}</span></footer>
          </div>
        </div>
      </div>
      <style jsx global>{`@media print { @page { size: A4; margin: 0; } html, body { background: white !important; } body * { visibility: hidden !important; } .invoice-paper, .invoice-paper * { visibility: visible !important; } .invoice-paper { position: absolute !important; inset: 0 auto auto 0 !important; width: 210mm !important; max-width: 210mm !important; min-height: 297mm !important; margin: 0 !important; box-shadow: none !important; } .invoice-paper > div { padding: 12mm !important; } .no-print { display: none !important; } input, textarea { border: 0 !important; } } .invoice-paper { max-width: 794px; min-height: 1123px; }`}</style>
    </main>
  );
}
