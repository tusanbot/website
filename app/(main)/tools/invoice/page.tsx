"use client";

import { useMemo, useRef, useState } from "react";
import { FileDown, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type Item = { id: number; title: string; qty: number; price: number; discount: number };

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";
const today = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date());

function money(value: number) {
  return new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.round(value)));
}

function rowAmount(item: Item) {
  const gross = item.qty * item.price;
  return Math.max(0, gross - Math.min(gross, item.discount));
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
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>([{ id: 1, title: "", qty: 1, price: 0, discount: 0 }]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const discount = items.reduce((sum, item) => sum + Math.min(item.qty * item.price, item.discount), 0);
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  }, [items]);

  const updateItem = (id: number, patch: Partial<Item>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const addItem = () => setItems((current) => [...current, { id: Date.now(), title: "", qty: 1, price: 0, discount: 0 }]);
  const removeItem = (id: number) => setItems((current) => current.length === 1 ? current : current.filter((item) => item.id !== id));

  const readImage = (file: File, setter: (value: string | null) => void) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const printInvoice = () => {
    setError("");
    document.body.classList.add("invoice-print-mode");
    const cleanup = () => document.body.classList.remove("invoice-print-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  const exportPdf = async () => {
    if (!exportRef.current || exporting) return;
    setError("");
    setExporting(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const node = exportRef.current;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: false,
        allowTaint: true,
        logging: false,
        width: 794,
        windowWidth: 794,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const margin = 6;
      const pageWidth = 210 - margin * 2;
      const pageHeight = 297 - margin * 2;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      let offset = 0;
      let page = 0;
      while (offset < imageHeight - 0.1) {
        if (page > 0) pdf.addPage();
        const height = Math.min(pageHeight, imageHeight - offset);
        const sourceY = Math.floor((offset / imageHeight) * canvas.height);
        const sourceHeight = Math.max(1, Math.min(canvas.height - sourceY, Math.ceil((height / imageHeight) * canvas.height)));
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = sourceHeight;
        const ctx = slice.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.94), "JPEG", margin, margin, pageWidth, height, undefined, "FAST");
        offset += height;
        page += 1;
      }
      pdf.save(`invoice-${invoiceNo || "tusan"}.pdf`);
    } catch (err) {
      console.error("Invoice PDF export failed", err);
      setError("ساخت فایل PDF انجام نشد. مرورگر را یک‌بار تازه‌سازی کنید و دوباره تلاش کنید.");
    } finally {
      setExporting(false);
    }
  };

  const InvoiceContent = ({ exportMode = false }: { exportMode?: boolean }) => (
    <div className={exportMode ? "invoice-export-sheet" : "invoice-paper"} dir="rtl">
      <div className="invoice-inner">
        <div className="invoice-header">
          <div className="invoice-brand">
            {logo && <img src={logo} alt="لوگو" className="invoice-logo" />}
            <div><h2>فاکتور</h2><p>{seller || "—"}</p></div>
          </div>
          <div className="invoice-meta"><div>شماره: {invoiceNo || "—"}</div><div>تاریخ: {date || "—"}</div></div>
        </div>
        <div className="invoice-customer"><div><b>مشتری:</b> {customer || "—"}</div><div><b>تماس:</b> {phone || "—"}</div></div>
        <table className="invoice-table"><thead><tr><th>شرح</th><th>تعداد</th><th>مبلغ واحد</th><th>تخفیف</th><th>مبلغ</th></tr></thead><tbody>
          {items.map((item) => <tr key={item.id}><td>{item.title || "—"}</td><td>{money(item.qty)}</td><td>{money(item.price)}</td><td>{money(item.discount)}</td><td>{money(rowAmount(item))}</td></tr>)}
        </tbody></table>
        <div className="invoice-totals"><div><span>جمع</span><b>{money(totals.subtotal)}</b></div><div><span>تخفیف</span><b>{money(totals.discount)}</b></div><div className="invoice-final"><span>مبلغ نهایی</span><b>{money(totals.total)}</b></div></div>
        <div className="invoice-notes"><b>توضیحات</b><p>{notes || "—"}</p></div>
        {seal && <div className="invoice-seal"><img src={seal} alt="مهر" /></div>}
        <footer>فاکتور ساز رایگان توسن · <span dir="ltr">{SITE_URL}</span></footer>
      </div>
    </div>
  );

  return (
    <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-black">فاکتورساز</h1><p className="mt-1 text-sm text-[var(--text-muted)]">ساخت فاکتور فارسی، چاپ و خروجی PDF</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printInvoice} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-bold"><Printer size={18}/> چاپ</button>
            <button type="button" onClick={exportPdf} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white disabled:opacity-60"><FileDown size={18}/> {exporting ? "در حال ساخت PDF..." : "خروجی PDF"}</button>
          </div>
        </div>
        {error && <div className="no-print mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        <div className="no-print mb-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold">صادرکننده<input value={seller} onChange={(e)=>setSeller(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
          <label className="text-sm font-bold">نام مشتری<input value={customer} onChange={(e)=>setCustomer(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
          <label className="text-sm font-bold">شماره تماس<input value={phone} onChange={(e)=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
          <label className="text-sm font-bold">شماره فاکتور<input value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
          <label className="text-sm font-bold">تاریخ<input value={date} onChange={(e)=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
          <div className="text-sm font-bold">لوگو و مهر<div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={()=>logoInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15}/>{logo?"تغییر لوگو":"آپلود لوگو"}</button><button type="button" onClick={()=>sealInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15}/>{seal?"تغییر مهر":"آپلود مهر"}</button>{logo&&<button type="button" onClick={()=>setLogo(null)} className="rounded-xl border border-red-200 px-2 py-2 text-red-600"><X size={15}/></button>}{seal&&<button type="button" onClick={()=>setSeal(null)} className="rounded-xl border border-red-200 px-2 py-2 text-red-600"><X size={15}/></button>}</div><input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)readImage(f,setLogo);e.currentTarget.value=""}}/><input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)readImage(f,setSeal);e.currentTarget.value=""}}/></div>
        </div></div>

        <div ref={invoiceRef}><InvoiceContent /></div>
        <div ref={exportRef} className="invoice-export-host" aria-hidden="true"><InvoiceContent exportMode /></div>
        <div className="no-print mt-3 flex justify-end gap-2"><button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--primary)] px-4 py-2 font-bold text-[var(--primary)]"><Plus size={17}/> افزودن ردیف</button>{items.length>1&&<button type="button" onClick={()=>removeItem(items[items.length-1].id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={17}/> حذف ردیف آخر</button>}</div>
      </div>
      <style jsx global>{`
        .invoice-paper,.invoice-export-sheet{width:794px;max-width:100%;min-height:1123px;margin:0 auto;background:#fff;color:#0f172a;box-sizing:border-box;}
        .invoice-export-host{position:fixed;left:-10000px;top:0;width:794px;pointer-events:none;}
        .invoice-export-sheet{max-width:none;box-shadow:none;}
        .invoice-inner{padding:42px;min-height:1123px;box-sizing:border-box;font-family:Arial,Tahoma,sans-serif;}
        .invoice-header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #0f172a;padding-bottom:24px;align-items:flex-start;}
        .invoice-brand{display:flex;gap:16px;align-items:flex-start}.invoice-logo{width:64px;height:64px;object-fit:contain}.invoice-brand h2{font-size:30px;margin:0;font-weight:900}.invoice-brand p{font-size:18px;margin:8px 0 0;font-weight:700}.invoice-meta{font-size:14px;line-height:2.1}.invoice-customer{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;border-radius:12px;padding:16px;margin:24px 0;font-size:14px}.invoice-table{width:100%;border-collapse:collapse;font-size:13px}.invoice-table th{background:#f1f5f9;border-bottom:1px solid #cbd5e1;padding:12px;text-align:center}.invoice-table th:first-child{text-align:right}.invoice-table td{border-bottom:1px solid #e2e8f0;padding:10px;text-align:center}.invoice-table td:first-child{text-align:right}.invoice-totals{width:340px;max-width:100%;margin:24px 0 0 auto;font-size:14px}.invoice-totals>div{display:flex;justify-content:space-between;padding:7px 0}.invoice-final{border-top:2px solid #0f172a;margin-top:5px;padding-top:12px!important;font-size:18px;font-weight:900}.invoice-notes{margin-top:30px;font-size:13px}.invoice-notes p{white-space:pre-wrap;margin:8px 0;line-height:1.9}.invoice-seal{margin-top:20px;text-align:right}.invoice-seal img{width:96px;height:96px;object-fit:contain}.invoice-inner footer{margin-top:48px;border-top:1px solid #cbd5e1;padding-top:14px;text-align:center;font-size:11px;color:#64748b;direction:rtl;}
        @media print{
          @page{size:A4;margin:0;}
          html,body{margin:0!important;padding:0!important;background:#fff!important;}
          body.invoice-print-mode *{visibility:hidden!important;}
          body.invoice-print-mode .invoice-paper,body.invoice-print-mode .invoice-paper *{visibility:visible!important;}
          body.invoice-print-mode .invoice-paper{position:absolute!important;left:0!important;top:0!important;width:794px!important;max-width:none!important;min-height:1123px!important;margin:0!important;box-shadow:none!important;}
          body.invoice-print-mode .no-print,body.invoice-print-mode .invoice-export-host{display:none!important;}
          body.invoice-print-mode .invoice-inner{padding:42px!important;}
        }
      `}</style>
    </main>
  );
}
