"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, Printer, Trash2, FileDown, Upload, X, Check } from "lucide-react";

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";
type Item = { id: number; title: string; qty: number; price: number; discount: number };
type InvoiceTheme = "classic" | "modern" | "tusan" | "minimal" | "formal";

const themes: { id: InvoiceTheme; label: string; description: string; icon: string }[] = [
  { id: "classic", label: "کلاسیک", description: "سنتی و متعادل", icon: "▤" },
  { id: "modern", label: "مدرن", description: "جسور و امروزی", icon: "◈" },
  { id: "tusan", label: "توسن", description: "هویت اختصاصی توسن", icon: "✦" },
  { id: "minimal", label: "مینیمال", description: "ساده و کم‌جوهر", icon: "—" },
  { id: "formal", label: "رسمی", description: "شرکتی و سازمانی", icon: "▣" },
];

const today = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date());
const money = (value: number) => new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.round(value)));

export default function InvoiceToolPage() {
  const [seller, setSeller] = useState("کافی‌نت توسن");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [seal, setSeal] = useState<string | null>(null);
  const [theme, setTheme] = useState<InvoiceTheme>("classic");
  const [items, setItems] = useState<Item[]>([{ id: 1, title: "", qty: 1, price: 0, discount: 0 }]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const discount = items.reduce((s, i) => s + Math.min(i.qty * i.price, i.discount), 0);
    return { subtotal, discount, total: Math.max(0, subtotal - discount) };
  }, [items]);

  const updateItem = (id: number, patch: Partial<Item>) => setItems((c) => c.map((i) => i.id === id ? { ...i, ...patch } : i));
  const addItem = () => setItems((c) => [...c, { id: Date.now(), title: "", qty: 1, price: 0, discount: 0 }]);
  const removeItem = (id: number) => setItems((c) => c.length === 1 ? c : c.filter((i) => i.id !== id));
  const readImage = (file: File, setter: (v: string | null) => void) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader(); reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file);
  };

  const printInvoice = () => window.print();
  const exportPdf = async () => {
    if (!invoiceRef.current) return;
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(invoiceRef.current, { scale: Math.min(2, window.devicePixelRatio || 1.5), backgroundColor: "#fff", useCORS: true, allowTaint: false, logging: false });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const margin = 8, width = 210 - margin * 2, height = 297 - margin * 2, imageHeight = canvas.height * width / canvas.width;
      let offset = 0, page = 0;
      while (offset < imageHeight - .1) {
        if (page++) pdf.addPage();
        const sliceMm = Math.min(height, imageHeight - offset);
        const sourceY = Math.floor(offset / imageHeight * canvas.height);
        const sourceH = Math.max(1, Math.min(canvas.height - sourceY, Math.ceil(sliceMm / imageHeight * canvas.height)));
        const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = sourceH;
        const ctx = slice.getContext("2d"); if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height); ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceH, 0, 0, canvas.width, sourceH);
        pdf.addImage(slice.toDataURL("image/jpeg", .92), "JPEG", margin, margin, width, Math.min(height, sourceH * width / canvas.width), undefined, "FAST");
        offset += sliceMm;
      }
      pdf.save(`invoice-${invoiceNo || "tusan"}.pdf`);
    } catch (error) { console.error(error); window.alert("ساخت PDF انجام نشد؛ از چاپ و Print to PDF استفاده کنید."); }
  };

  const themeClass = {
    classic: "invoice-classic",
    modern: "invoice-modern",
    tusan: "invoice-tusan",
    minimal: "invoice-minimal",
    formal: "invoice-formal",
  }[theme];

  return (
    <main dir="rtl" className="min-h-screen page-background p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-2xl font-black">فاکتورساز</h1><p className="mt-1 text-sm text-[var(--text-muted)]">ساخت فاکتور فارسی، چاپ و خروجی PDF</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={printInvoice} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-bold"><Printer size={18}/> چاپ</button>
            <button type="button" onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 font-bold text-white"><FileDown size={18}/> خروجی PDF</button>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="order-2 xl:order-1 min-w-0">
            <div ref={invoiceRef} className={`invoice-paper ${themeClass} mx-auto bg-white text-slate-900 shadow-xl`}>
              <div className="invoice-inner">
                <header className="invoice-header">
                  <div className="invoice-brand">
                    {logo && <img src={logo} alt="لوگو" className="invoice-logo" crossOrigin="anonymous"/>}
                    <div><div className="invoice-kicker">صورتحساب</div><h2>فاکتور</h2><p>{seller || "—"}</p></div>
                  </div>
                  <div className="invoice-meta"><div><span>شماره فاکتور</span><b>{invoiceNo || "—"}</b></div><div><span>تاریخ</span><b>{date || "—"}</b></div></div>
                </header>

                <section className="invoice-customer"><div><span>صورتحساب برای</span><b>{customer || "مشتری"}</b></div><div><span>شماره تماس</span><b>{phone || "—"}</b></div></section>

                <div className="invoice-table-wrap"><table className="invoice-table"><thead><tr><th>شرح کالا / خدمت</th><th>تعداد</th><th>مبلغ واحد</th><th>تخفیف</th><th>مبلغ</th></tr></thead><tbody>
                  {items.map((item) => <tr key={item.id}>
                    <td><input className="no-print invoice-input invoice-title-input" value={item.title} onChange={(e)=>updateItem(item.id,{title:e.target.value})}/><span className="print-only">{item.title || "—"}</span></td>
                    <td><input type="number" min="1" className="no-print invoice-input invoice-number-input" value={item.qty} onChange={(e)=>updateItem(item.id,{qty:Math.max(1,Number(e.target.value)||1)})}/><span className="print-only">{money(item.qty)}</span></td>
                    <td><input type="number" min="0" className="no-print invoice-input invoice-number-input" value={item.price} onChange={(e)=>updateItem(item.id,{price:Math.max(0,Number(e.target.value)||0)})}/><span className="print-only">{money(item.price)}</span></td>
                    <td><input type="number" min="0" className="no-print invoice-input invoice-number-input" value={item.discount} onChange={(e)=>updateItem(item.id,{discount:Math.max(0,Number(e.target.value)||0)})}/><span className="print-only">{money(item.discount)}</span></td>
                    <td className="font-bold">{money(Math.max(0,item.qty*item.price-Math.min(item.qty*item.price,item.discount)))}</td>
                  </tr>)}
                </tbody></table></div>

                <div className="no-print mt-3 flex justify-end gap-2"><button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--primary)] px-4 py-2 font-bold text-[var(--primary)]"><Plus size={17}/> افزودن ردیف</button>{items.length>1&&<button type="button" onClick={()=>removeItem(items[items.length-1].id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={17}/> حذف ردیف آخر</button>}</div>

                <section className="invoice-bottom"><div className="invoice-notes"><h3>توضیحات</h3><textarea className="no-print" rows={4} value={notes} onChange={(e)=>setNotes(e.target.value)}/><p className="print-only">{notes || "—"}</p></div><div className="invoice-totals"><div><span>جمع</span><b>{money(totals.subtotal)}</b></div><div><span>تخفیف</span><b>{money(totals.discount)}</b></div><div className="invoice-grand"><span>مبلغ نهایی</span><b>{money(totals.total)}</b></div></div></section>
                {seal && <div className="invoice-seal"><img src={seal} alt="مهر" crossOrigin="anonymous"/></div>}
                <footer>فاکتور ساز رایگان توسن · <span dir="ltr">{SITE_URL}</span></footer>
              </div>
            </div>
          </section>

          <aside className="no-print order-1 xl:order-2 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm xl:sticky xl:top-5">
            <div><h2 className="text-lg font-black">تنظیمات فاکتور</h2><p className="mt-1 text-xs text-[var(--text-muted)]">اطلاعات و ظاهر فاکتور را از اینجا تنظیم کنید.</p></div>
            <div className="mt-5 space-y-3">
              <label className="block text-sm font-bold">صادرکننده<input value={seller} onChange={(e)=>setSeller(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
              <label className="block text-sm font-bold">نام مشتری<input value={customer} onChange={(e)=>setCustomer(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
              <div className="grid grid-cols-2 gap-2"><label className="text-sm font-bold">شماره تماس<input value={phone} onChange={(e)=>setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label><label className="text-sm font-bold">شماره فاکتور<input value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label></div>
              <label className="block text-sm font-bold">تاریخ<input value={date} onChange={(e)=>setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 font-normal"/></label>
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="font-black">انتخاب تم</h3><p className="mt-1 text-xs text-[var(--text-muted)]">هر تم ساختار بصری متفاوتی دارد.</p><div className="mt-3 space-y-2">
              {themes.map((t)=><button key={t.id} type="button" onClick={()=>setTheme(t.id)} aria-pressed={theme===t.id} className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-right transition ${theme===t.id ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black ${t.id==="tusan"?"bg-[#09967c] text-white":t.id==="modern"?"bg-slate-900 text-white":t.id==="formal"?"bg-slate-700 text-white":t.id==="minimal"?"border border-slate-300":"bg-slate-100 text-slate-700"}`}>{t.icon}</span><span className="min-w-0 flex-1"><b className="block text-sm">{t.label}</b><small className="text-xs text-[var(--text-muted)]">{t.description}</small></span>{theme===t.id&&<Check size={18} className="text-[var(--primary)]"/>}</button>)}
            </div></div>
            <div className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="font-black">لوگو و مهر</h3><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={()=>logoInputRef.current?.click()} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15} className="mx-auto mb-1"/>{logo?"تغییر لوگو":"آپلود لوگو"}</button><button type="button" onClick={()=>sealInputRef.current?.click()} className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold"><Upload size={15} className="mx-auto mb-1"/>{seal?"تغییر مهر":"آپلود مهر"}</button></div><div className="mt-2 flex gap-2">{logo&&<button type="button" onClick={()=>setLogo(null)} className="flex-1 rounded-lg border border-red-200 py-1 text-xs text-red-600"><X size={13} className="inline"/> حذف لوگو</button>}{seal&&<button type="button" onClick={()=>setSeal(null)} className="flex-1 rounded-lg border border-red-200 py-1 text-xs text-red-600"><X size={13} className="inline"/> حذف مهر</button>}</div><input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)readImage(f,setLogo);e.currentTarget.value=""}}/><input ref={sealInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)readImage(f,setSeal);e.currentTarget.value=""}}/></div>
          </aside>
        </div>
      </div>
      <style jsx global>{`
        .invoice-paper{max-width:794px;min-height:1123px;overflow:hidden}
        .invoice-inner{min-height:1123px;padding:42px;position:relative}
        .invoice-header{display:flex;justify-content:space-between;gap:30px;align-items:flex-start;padding-bottom:28px}
        .invoice-brand{display:flex;gap:18px;align-items:center}.invoice-logo{width:72px;height:72px;object-fit:contain}.invoice-kicker{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b}.invoice-brand h2{font-size:34px;line-height:1.1;font-weight:900;margin-top:4px}.invoice-brand p{font-size:17px;font-weight:800;margin-top:8px}
        .invoice-meta{display:grid;grid-template-columns:repeat(2,minmax(90px,1fr));gap:8px;min-width:220px}.invoice-meta div{padding:11px 14px;border-radius:12px;background:#f8fafc}.invoice-meta span{display:block;font-size:10px;color:#64748b;margin-bottom:4px}.invoice-meta b{font-size:13px}
        .invoice-customer{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:18px 20px;margin:25px 0}.invoice-customer span{display:block;font-size:10px;color:#64748b;margin-bottom:5px}.invoice-customer b{font-size:14px}
        .invoice-table-wrap{overflow:hidden}.invoice-table{width:100%;border-collapse:collapse;font-size:12px}.invoice-table th{padding:12px;text-align:center;font-weight:800}.invoice-table th:first-child{text-align:right}.invoice-table td{padding:11px 8px;text-align:center;border-bottom:1px solid #e2e8f0}.invoice-table td:first-child{text-align:right}.invoice-input{width:100%;background:transparent;border:0;outline:0;padding:6px}.invoice-number-input{max-width:105px;text-align:center;margin:auto}.print-only{display:none}
        .invoice-bottom{display:grid;grid-template-columns:1fr 300px;gap:35px;margin-top:30px}.invoice-notes h3{font-size:12px;font-weight:800;margin-bottom:8px}.invoice-notes textarea{width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px;resize:none;background:transparent}.invoice-totals>div{display:flex;justify-content:space-between;padding:7px 0;font-size:12px}.invoice-grand{margin-top:7px;padding:15px 16px!important;border-radius:14px;font-size:16px!important;font-weight:900}.invoice-seal{margin-top:28px}.invoice-seal img{width:100px;height:100px;object-fit:contain}.invoice-paper footer{margin-top:42px;padding-top:13px;border-top:1px solid #cbd5e1;text-align:center;font-size:10px;color:#64748b}
        .invoice-modern .invoice-inner{padding:0 42px 42px}.invoice-modern .invoice-header{margin:0 -42px 25px;padding:38px 42px 30px;background:#0f172a;color:white}.invoice-modern .invoice-kicker,.invoice-modern .invoice-meta span{color:#cbd5e1}.invoice-modern .invoice-meta div{background:#1e293b}.invoice-modern .invoice-brand h2{color:white}.invoice-modern .invoice-customer{border-left:5px solid #0f172a;background:#f1f5f9}.invoice-modern .invoice-table th{background:#0f172a;color:white}.invoice-modern .invoice-table td{padding-top:15px;padding-bottom:15px}.invoice-modern .invoice-grand{background:#0f172a;color:white}
        .invoice-tusan .invoice-inner{border-top:10px solid #09967c}.invoice-tusan .invoice-header{background:linear-gradient(135deg,#effcf8,#fff);padding:25px 22px;border-radius:0 0 24px 24px;border-bottom:1px solid #b7e8dd}.invoice-tusan .invoice-brand h2{color:#087a66}.invoice-tusan .invoice-meta div{background:#e9f8f4;border:1px solid #c4ebe2}.invoice-tusan .invoice-customer{background:#f3fbf9;border:1px solid #c9eee6;border-radius:18px}.invoice-tusan .invoice-table{border:1px solid #bfe8df}.invoice-tusan .invoice-table th{background:#09967c;color:white}.invoice-tusan .invoice-table td{border-color:#d7eee9}.invoice-tusan .invoice-grand{background:#09967c;color:white}.invoice-tusan .invoice-paper footer{color:#087a66;border-color:#a9ddd3}
        .invoice-minimal .invoice-inner{padding:55px}.invoice-minimal .invoice-header{border-bottom:1px solid #cbd5e1}.invoice-minimal .invoice-meta div{background:white;padding:5px 0}.invoice-minimal .invoice-customer{border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:15px 0}.invoice-minimal .invoice-table th{border-bottom:2px solid #334155;background:white}.invoice-minimal .invoice-table td{border-bottom:1px solid #e2e8f0}.invoice-minimal .invoice-grand{border-top:2px solid #334155;border-bottom:2px solid #334155;border-radius:0;background:white}.invoice-minimal .invoice-paper footer{border-top:1px solid #e2e8f0}
        .invoice-formal .invoice-inner{border:3px double #475569;padding:38px}.invoice-formal .invoice-header{border-bottom:3px double #475569}.invoice-formal .invoice-brand h2{font-family:Georgia,serif;font-size:31px}.invoice-formal .invoice-customer{background:#f1f5f9;border:1px solid #94a3b8;border-radius:4px}.invoice-formal .invoice-meta div{border:1px solid #94a3b8;border-radius:4px;background:#f8fafc}.invoice-formal .invoice-table{border:1px solid #64748b}.invoice-formal .invoice-table th{background:#475569;color:white;border-left:1px solid #64748b}.invoice-formal .invoice-table td{border:1px solid #cbd5e1}.invoice-formal .invoice-grand{background:#e2e8f0;border:1px solid #64748b;border-radius:4px}.invoice-formal .invoice-paper footer{border-top:3px double #64748b}
        @media print{ @page{size:A4;margin:0} html,body{background:#fff!important} body *{visibility:hidden!important} .invoice-paper,.invoice-paper *{visibility:visible!important} .invoice-paper{position:absolute!important;top:0!important;left:0!important;width:210mm!important;max-width:210mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important} .invoice-inner{min-height:297mm!important;padding:12mm!important} .no-print{display:none!important}.print-only{display:inline!important}.invoice-paper input,.invoice-paper textarea{border:0!important}.invoice-modern .invoice-header{margin-left:-12mm!important;margin-right:-12mm!important;padding-left:12mm!important;padding-right:12mm!important} }
        @media(max-width:1279px){.invoice-paper{max-width:100%}}
        @media(max-width:640px){.invoice-inner{padding:22px}.invoice-header{flex-direction:column}.invoice-meta{width:100%;min-width:0}.invoice-customer,.invoice-bottom{grid-template-columns:1fr}.invoice-table{font-size:10px}.invoice-table th,.invoice-table td{padding:7px 4px}.invoice-minimal .invoice-inner{padding:22px}.invoice-formal .invoice-inner{padding:22px}}
      `}</style>
    </main>
  );
}
