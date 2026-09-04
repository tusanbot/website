"use client";

import { PointerEvent, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Eye, GripVertical, Plus, Printer, RotateCcw, Settings2, Trash2 } from "lucide-react";

type Kind = "text" | "textarea" | "number" | "date" | "select" | "multi" | "checkbox" | "section";
type Field = { id: string; kind: Kind; label: string; placeholder: string; required: boolean; options: string[]; width: 1 | 2 | 3 | 4 };
type Row = { id: string; columns: 1 | 2 | 3 | 4; fieldIds: string[] };
type DragState = { type: "field"; fieldId: string } | { type: "row"; rowId: string } | null;

const labels: Record<Kind, string> = { text: "متن کوتاه", textarea: "توضیحات", number: "عدد", date: "تاریخ", select: "انتخابی", multi: "چندانتخابی", checkbox: "تأیید", section: "عنوان بخش" };
const makeId = () => `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const initialField: Field = { id: "f-name", kind: "text", label: "نام و نام خانوادگی", placeholder: "", required: true, options: [], width: 2 };
const initialRow: Row = { id: "r-1", columns: 2, fieldIds: [initialField.id] };

export default function FormBuilder() {
  const [title, setTitle] = useState("فرم ثبت‌نام مشتری");
  const [fields, setFields] = useState<Field[]>([initialField]);
  const [rows, setRows] = useState<Row[]>([initialRow]);
  const [selected, setSelected] = useState(initialField.id);
  const [mode, setMode] = useState<"design" | "preview">("design");
  const [copies, setCopies] = useState(1);
  const [drag, setDrag] = useState<DragState>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const selectedField = fields.find(f => f.id === selected);

  const addField = (kind: Kind) => {
    const id = makeId();
    const field: Field = { id, kind, label: labels[kind], placeholder: "", required: false, options: kind === "select" || kind === "multi" ? ["گزینه اول", "گزینه دوم"] : [], width: 1 };
    setFields(v => [...v, field]);
    setRows(v => v.map((r, i) => i === v.length - 1 ? { ...r, fieldIds: [...r.fieldIds, id] } : r));
    setSelected(id);
  };
  const updateField = (patch: Partial<Field>) => setFields(v => v.map(f => f.id === selected ? { ...f, ...patch } : f));
  const removeField = () => { setFields(v => v.filter(f => f.id !== selected)); setRows(v => v.map(r => ({ ...r, fieldIds: r.fieldIds.filter(id => id !== selected) })).filter(r => r.fieldIds.length)); setSelected(fields.find(f => f.id !== selected)?.id || ""); };
  const addRow = () => setRows(v => [...v, { id: `r-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, columns: 2, fieldIds: [] }]);
  const removeRow = (rowId: string) => { if (rows.length === 1) return; const row = rows.find(r => r.id === rowId); if (!row) return; const target = rows.find(r => r.id !== rowId); setRows(v => v.filter(r => r.id !== rowId).map(r => r.id === target?.id ? { ...r, fieldIds: [...r.fieldIds, ...row.fieldIds] } : r)); };
  const moveField = (fieldId: string, dir: -1 | 1) => setRows(v => v.map(row => { const i = row.fieldIds.indexOf(fieldId); if (i < 0) return row; const j = i + dir; if (j < 0 || j >= row.fieldIds.length) return row; const ids = [...row.fieldIds]; [ids[i], ids[j]] = [ids[j], ids[i]]; return { ...row, fieldIds: ids }; }));
  const moveRow = (rowId: string, dir: -1 | 1) => setRows(v => { const i = v.findIndex(r => r.id === rowId), j = i + dir; if (i < 0 || j < 0 || j >= v.length) return v; const a = [...v]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  const setColumns = (rowId: string, columns: 1 | 2 | 3 | 4) => setRows(v => v.map(r => r.id === rowId ? { ...r, columns } : r));
  const duplicate = () => { const id = makeId(); if (!selectedField) return; const copy: Field = { ...selectedField, id, label: `${selectedField.label} (کپی)` }; setFields(v => [...v, copy]); setRows(v => v.map(r => r.fieldIds.includes(selected) ? { ...r, fieldIds: [...r.fieldIds, id] } : r)); setSelected(id); };
  const reset = () => { setTitle("فرم ثبت‌نام مشتری"); setFields([initialField]); setRows([initialRow]); setSelected(initialField.id); setCopies(1); setMode("design"); setDrag(null); };

  const startDrag = (event: PointerEvent, next: Exclude<DragState, null>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(next);
    document.body.style.overscrollBehavior = "none";
  };
  const endDrag = () => { setDrag(null); setDragOver(null); document.body.style.overscrollBehavior = ""; };
  const dropFieldIntoRow = (rowId: string) => {
    if (!drag || drag.type !== "field") return endDrag();
    const fieldId = drag.fieldId;
    setRows(v => v.map(r => ({ ...r, fieldIds: r.fieldIds.filter(id => id !== fieldId) })).map(r => r.id === rowId ? { ...r, fieldIds: [...r.fieldIds, fieldId] } : r));
    setSelected(fieldId); endDrag();
  };
  const reorderField = (targetRowId: string, targetFieldId: string) => {
    if (!drag || drag.type !== "field" || drag.fieldId === targetFieldId) return endDrag();
    const sourceId = drag.fieldId;
    setRows(v => v.map(r => ({ ...r, fieldIds: r.fieldIds.filter(id => id !== sourceId) })).map(r => {
      if (r.id !== targetRowId) return r;
      const ids = [...r.fieldIds]; const index = ids.indexOf(targetFieldId); ids.splice(index < 0 ? ids.length : index, 0, sourceId); return { ...r, fieldIds: ids };
    }));
    setSelected(sourceId); endDrag();
  };
  const reorderRow = (targetRowId: string) => {
    if (!drag || drag.type !== "row" || drag.rowId === targetRowId) return endDrag();
    setRows(v => { const from = v.findIndex(r => r.id === drag.rowId), to = v.findIndex(r => r.id === targetRowId); if (from < 0 || to < 0) return v; const next = [...v]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; });
    endDrag();
  };

  const fieldMap = useMemo(() => new Map(fields.map(f => [f.id, f])), [fields]);
  const printCopies = Math.max(1, Math.min(100, copies));

  return <main dir="rtl" className="min-h-screen page-background py-7 md:py-10">
    <style jsx global>{`@media print{body *{visibility:hidden!important}.print-area,.print-area *{visibility:visible!important}.print-area{position:absolute!important;inset:0!important;width:100%!important;padding:8mm!important}.no-print{display:none!important}.print-only{display:block!important}.print-copy{break-after:page;page-break-after:always}.print-copy:last-child{break-after:auto;page-break-after:auto}}.print-only{display:none}`}</style>
    <div className="no-print mx-auto max-w-7xl px-4 lg:px-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Settings2 className="text-[var(--primary)]" size={22}/><h1 className="text-3xl font-black">فرم‌ساز کافی‌نت توسن</h1></div><p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">فرم ثبت‌نام خدمات را با سطر و ستون طراحی کنید. در موبایل هم با دستگیرهٔ جابه‌جایی می‌توانید فیلدها و سطرها را بکشید و جابه‌جا کنید.</p></div><div className="flex gap-2"><button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold"><RotateCcw size={16}/> شروع مجدد</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-black text-white"><Printer size={16}/> چاپ {printCopies} نسخه</button></div></header></div>
    <div className="mx-auto mt-6 grid max-w-7xl gap-5 px-4 lg:grid-cols-[220px_minmax(0,1fr)_290px] lg:px-6">
      <aside className="no-print rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4"><h2 className="font-black">افزودن فیلد</h2><div className="mt-3 grid grid-cols-2 gap-2">{(Object.keys(labels) as Kind[]).map(k => <button key={k} onClick={() => addField(k)} className="rounded-xl border border-[var(--border)] p-2.5 text-xs font-bold transition hover:border-[var(--primary)] hover:bg-[var(--primary)]/5">+ {labels[k]}</button>)}</div><div className="mt-5 rounded-2xl bg-[var(--surface-secondary)] p-3"><div className="text-xs font-bold text-[var(--text-muted)]">تعداد نسخه چاپ</div><input min={1} max={100} type="number" value={copies} onChange={e => setCopies(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 text-center font-black"/></div><button onClick={() => setMode(mode === "design" ? "preview" : "design")} className="mt-4 w-full rounded-xl border border-[var(--border)] p-3 text-sm font-black">{mode === "design" ? <><Eye size={16} className="mr-1 inline"/> پیش‌نمایش نهایی</> : "بازگشت به طراحی"}</button></aside>

      <section className="print-area rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm md:p-7">
        <div className="no-print">{mode === "design" ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4"><div><input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent text-2xl font-black outline-none"/><p className="mt-1 text-xs text-[var(--text-muted)]">برای جابه‌جایی در موبایل فقط دستگیرهٔ ⋮⋮ را لمس و بکشید؛ لمس کارت برای انتخاب است.</p></div><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--primary)]">طراحی فشرده</span></div><div className="space-y-3">{rows.map((row, ri) => <div key={row.id} onPointerMove={() => drag?.type === "row" && setDragOver(row.id)} onPointerUp={() => drag?.type === "row" ? reorderRow(row.id) : undefined} className={`rounded-2xl border border-dashed p-3 transition ${dragOver === row.id ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)]"}`}><div className="mb-2 flex items-center gap-2"><span onPointerDown={e => startDrag(e,{type:"row",rowId:row.id})} className="cursor-grab touch-none select-none rounded-lg p-1 text-[var(--text-muted)] active:cursor-grabbing" aria-label="جابجایی سطر"><GripVertical size={18}/></span><span className="text-xs font-black">سطر {ri + 1}</span><div className="mr-auto flex items-center gap-1"><span className="text-[10px] text-[var(--text-muted)]">ستون:</span>{([1,2,3,4] as const).map(n => <button key={n} onClick={() => setColumns(row.id,n)} className={`h-7 w-7 rounded-lg border text-xs font-bold ${row.columns === n ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)]"}`}>{n}</button>)}</div><button onClick={() => moveRow(row.id,-1)} className="rounded p-1" aria-label="سطر بالا"><ChevronUp size={15}/></button><button onClick={() => moveRow(row.id,1)} className="rounded p-1" aria-label="سطر پایین"><ChevronDown size={15}/></button>{rows.length > 1 && <button onClick={() => removeRow(row.id)} className="rounded p-1 text-red-500" aria-label="حذف سطر"><Trash2 size={15}/></button>}</div><div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${row.columns}, minmax(0, 1fr))` }} onPointerUp={() => drag?.type === "field" ? dropFieldIntoRow(row.id) : undefined}>{row.fieldIds.map(id => { const f = fieldMap.get(id); if (!f) return null; return <div key={id} onPointerMove={() => drag?.type === "field" && setDragOver(id)} onPointerUp={() => drag?.type === "field" ? reorderField(row.id,id) : undefined} className={`min-h-16 rounded-xl border bg-[var(--surface)] p-3 text-right transition ${selected === id ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/15" : "border-[var(--border)]"} ${dragOver === id ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/10" : ""}`}><div className="flex items-center gap-2"><span onPointerDown={e => startDrag(e,{type:"field",fieldId:id})} className="touch-none cursor-grab select-none rounded-md p-1 text-[var(--text-muted)] active:cursor-grabbing" aria-label="جابجایی فیلد"><GripVertical size={16}/></span><button onClick={() => setSelected(id)} className="min-w-0 flex-1 text-right"><span className="text-sm font-bold">{f.label}{f.required && <b className="mr-1 text-red-500">*</b>}</span></button><span className="text-[10px] text-[var(--text-muted)]">{labels[f.kind]}</span></div><div className="mt-3 h-5 rounded border border-dashed border-[var(--border)]"/></div>; })}{row.fieldIds.length === 0 && <div className="col-span-full rounded-xl border border-dashed p-4 text-center text-xs text-[var(--text-muted)]">فیلد را از سطر دیگری بکشید و اینجا رها کنید</div>}</div></div>)}</div><button onClick={addRow} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--primary)] px-4 py-2.5 text-sm font-black text-[var(--primary)]"><Plus size={16}/> سطر جدید</button></> : <FormPreview title={title} rows={rows} fields={fields}/>}</div>
        <div className="print-only"><FormCopies title={title} rows={rows} fields={fields} copies={printCopies}/></div>
      </section>

      <aside className="no-print rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5"><h2 className="font-black">تنظیم فیلد</h2>{selectedField ? <div className="mt-4 space-y-3"><label className="block text-xs font-bold">عنوان<input value={selectedField.label} onChange={e => updateField({label:e.target.value})} className="mt-1 w-full rounded-xl border p-2.5"/></label><label className="block text-xs font-bold">نوع<select value={selectedField.kind} onChange={e => updateField({kind:e.target.value as Kind})} className="mt-1 w-full rounded-xl border p-2.5">{(Object.keys(labels) as Kind[]).map(k => <option key={k} value={k}>{labels[k]}</option>)}</select></label><label className="block text-xs font-bold">راهنما<input value={selectedField.placeholder} onChange={e => updateField({placeholder:e.target.value})} className="mt-1 w-full rounded-xl border p-2.5"/></label><label className="flex items-center gap-2 rounded-xl border p-3 text-sm font-bold"><input type="checkbox" checked={selectedField.required} onChange={e => updateField({required:e.target.checked})}/> فیلد اجباری</label>{(selectedField.kind === "select" || selectedField.kind === "multi") && <label className="block text-xs font-bold">گزینه‌ها<textarea value={selectedField.options.join("\n")} onChange={e => updateField({options:e.target.value.split("\n").filter(Boolean)})} rows={5} className="mt-1 w-full rounded-xl border p-2.5"/></label>}<div className="rounded-2xl bg-[var(--surface-secondary)] p-3"><div className="mb-2 text-xs font-black">عرض نسبی فیلد</div><div className="grid grid-cols-4 gap-1">{([1,2,3,4] as const).map(n => <button key={n} onClick={() => updateField({width:n})} className={`rounded-lg border p-2 text-xs font-bold ${selectedField.width === n ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"}`}>{n}/4</button>)}</div></div><div className="flex gap-2"><button onClick={() => moveField(selected,-1)} className="flex-1 rounded-lg border p-2 text-xs font-bold">← جابه‌جایی</button><button onClick={duplicate} className="rounded-lg border p-2" aria-label="کپی فیلد"><Copy size={15}/></button></div><button onClick={removeField} className="w-full rounded-xl bg-red-50 p-2.5 text-sm font-bold text-red-600">حذف فیلد</button></div> : <p className="mt-3 text-sm text-[var(--text-muted)]">یک فیلد را انتخاب کنید.</p>}</aside>
    </div>
  </main>;
}

function FormPreview({ title, rows, fields }: { title: string; rows: Row[]; fields: Field[] }) { const map = new Map(fields.map(f => [f.id, f])); return <div className="mx-auto max-w-4xl"><div className="mb-5 text-center"><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">لطفاً اطلاعات را خوانا و کامل وارد کنید.</p></div>{rows.map(row => <div key={row.id} className="mb-3 grid gap-2" style={{gridTemplateColumns:`repeat(${row.columns},minmax(0,1fr))`}}>{row.fieldIds.map(id => { const f=map.get(id); if(!f)return null; return <div key={id} className="rounded-lg border border-slate-300 p-2.5"><div className="text-xs font-bold">{f.label}{f.required && <span className="mr-1 text-red-500">*</span>}</div><div className="mt-3 h-7 border-b border-dashed border-slate-300"/></div>})}</div>)}</div>; }

function FormCopies({ title, rows, fields, copies }: { title: string; rows: Row[]; fields: Field[]; copies: number }) {
  return <div className="mx-auto max-w-4xl">{Array.from({ length: copies }, (_, index) => <div key={index} className="print-copy"><FormPreview title={title} rows={rows} fields={fields}/></div>)}</div>;
}
