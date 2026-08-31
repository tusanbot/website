'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type StaffRole = 'order_manager' | 'support_operator'
type Assignment = { id: string; user_id: string; role_id: string; staff_code: StaffRole | null; status: string; commission_percent: number | null; role?: { code?: string; name?: string } | null }
type Service = { id: string; title: string; category: string; is_active: boolean }
type ServiceAccess = { service_id: string; status: string; commission_percent: number | null }

const roleLabel = (code: StaffRole | null) => code === 'order_manager' ? 'مدیر سفارشات' : code === 'support_operator' ? 'اپراتور پشتیبانی' : 'مقام نامشخص'

export default function StaffRoleManagement({ userId }: { userId: string }) {
  const [roles, setRoles] = useState<Assignment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [access, setAccess] = useState<ServiceAccess[]>([])
  const [selected, setSelected] = useState<StaffRole>('order_manager')
  const [commission, setCommission] = useState('0')
  const [serviceSearch, setServiceSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [serviceBusy, setServiceBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    setMessage('')
    const { data: roleData, error: roleError } = await supabase
      .from('staff_role_assignments')
      .select('id,user_id,role_id,staff_code,status,commission_percent,staff_roles:role_id(code,name)')
      .eq('user_id', userId)
    if (roleError) setMessage(`خطا در دریافت مقام‌ها: ${roleError.message}`)
    const nextRoles = (roleData ?? []).map((r: any) => ({ ...r, role: Array.isArray(r.staff_roles) ? r.staff_roles[0] : r.staff_roles })) as Assignment[]
    setRoles(nextRoles)

    const orderManagerApproved = nextRoles.some(r => r.status === 'approved' && (r.staff_code === 'order_manager' || r.role?.code === 'order_manager'))
    if (!orderManagerApproved) { setServices([]); setAccess([]); return }
    const [{ data: serviceData, error: serviceError }, { data: accessData, error: accessError }] = await Promise.all([
      supabase.from('services').select('id,title,category,is_active').eq('is_active', true).order('title'),
      supabase.from('staff_service_access').select('service_id,status,commission_percent').eq('user_id', userId),
    ])
    if (serviceError) setMessage(`خطا در دریافت خدمات: ${serviceError.message}`)
    if (accessError) setMessage(`خطا در دریافت دسترسی خدمات: ${accessError.message}`)
    setServices((serviceData ?? []) as Service[]); setAccess((accessData ?? []) as ServiceAccess[])
  }
  useEffect(() => { void load() }, [userId])
  const formatError = (error: unknown, fallback: string) => error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : fallback
  const grant = async () => {
    const value = selected === 'order_manager' ? Number(commission) : 0
    if (!Number.isFinite(value) || value < 0 || value > 100) { setMessage('درصد کارمزد مدیر سفارشات باید بین ۰ تا ۱۰۰ باشد.'); return }
    setBusy(true); setMessage('')
    try { const { error } = await supabase.rpc('approve_staff_role', { p_user_id: userId, p_role_code: selected, p_approve: true, p_commission: value }); if (error) throw error; await load(); setMessage(`مقام «${roleLabel(selected)}» با موفقیت اعطا شد.`) }
    catch (e) { setMessage(`اعطای مقام ناموفق بود: ${formatError(e, 'خطای نامشخص')}`) } finally { setBusy(false) }
  }
  const revoke = async (role: StaffRole) => {
    if (!window.confirm(`آیا از عزل مقام «${roleLabel(role)}» مطمئن هستید؟`)) return
    setBusy(true); setMessage('')
    try { const { error } = await supabase.rpc('approve_staff_role', { p_user_id: userId, p_role_code: role, p_approve: false, p_commission: 0 }); if (error) throw error; await load(); setMessage(`مقام «${roleLabel(role)}» با موفقیت عزل شد.`) }
    catch (e) { setMessage(`عزل مقام ناموفق بود: ${formatError(e, 'خطای نامشخص')}`) } finally { setBusy(false) }
  }
  const activeOrderManager = roles.find(r => r.status === 'approved' && (r.staff_code === 'order_manager' || r.role?.code === 'order_manager'))
  const categories = useMemo(() => ['all', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))], [services])
  const filteredServices = useMemo(() => { const q = serviceSearch.trim().toLowerCase(); return services.filter(s => (categoryFilter === 'all' || s.category === categoryFilter) && (!q || `${s.title} ${s.category}`.toLowerCase().includes(q))) }, [services, serviceSearch, categoryFilter])
  const isEnabled = (serviceId: string) => { const row = access.find(a => a.service_id === serviceId); return !row || row.status === 'approved' }
  const setService = async (serviceId: string, enabled: boolean) => { setServiceBusy(serviceId); setMessage(''); try { const { error } = await supabase.rpc('set_staff_service_access', { p_user_id: userId, p_service_id: serviceId, p_approve: enabled, p_commission: Number(activeOrderManager?.commission_percent ?? 0) || 0 }); if (error) throw error; await load() } catch (e) { setMessage(`تغییر دسترسی خدمت ناموفق بود: ${formatError(e, 'خطای نامشخص')}`) } finally { setServiceBusy(null) } }
  const setAllServices = async (enabled: boolean) => { setBusy(true); setMessage(''); try { for (const service of services) { const { error } = await supabase.rpc('set_staff_service_access', { p_user_id: userId, p_service_id: service.id, p_approve: enabled, p_commission: Number(activeOrderManager?.commission_percent ?? 0) || 0 }); if (error) throw error } await load(); setMessage(enabled ? 'همه خدمات فعال شدند.' : 'همه خدمات غیرفعال شدند.') } catch (e) { setMessage(`تغییر دسترسی خدمات ناموفق بود: ${formatError(e, 'خطای نامشخص')}`) } finally { setBusy(false) } }

  return <section dir="rtl" className="space-y-4 rounded-xl border p-4">
    <div><h3 className="font-semibold">مقام و دسترسی</h3><p className="mt-1 text-sm opacity-70">مدیریت مقام‌های فعال و دسترسی خدمات این کاربر.</p></div>
    <div className="flex flex-wrap items-center gap-2"><select value={selected} onChange={e => setSelected(e.target.value as StaffRole)} className="rounded-lg border px-3 py-2"><option value="order_manager">مدیر سفارشات</option><option value="support_operator">اپراتور پشتیبانی</option></select>{selected === 'order_manager' && <input value={commission} onChange={e => setCommission(e.target.value)} inputMode="decimal" min="0" max="100" type="number" className="w-24 rounded-lg border px-3 py-2" placeholder="کارمزد %" aria-label="درصد کارمزد مدیر سفارشات" />}<button type="button" onClick={grant} disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50">{busy ? 'در حال ثبت…' : 'اعطای مقام'}</button></div>
    <div className="space-y-2"><h4 className="font-semibold">مقام‌های فعلی</h4>{roles.filter(r => r.status === 'approved').length === 0 ? <div className="rounded-lg border p-3 text-sm opacity-70">مقام فعال ندارد.</div> : roles.filter(r => r.status === 'approved').map(role => { const code = role.staff_code ?? role.role?.code as StaffRole | undefined; return <div key={role.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"><div className="flex flex-wrap items-center gap-3"><span className="font-medium">{roleLabel(code ?? null)}</span>{code === 'order_manager' && <span>کارمزد: {Number(role.commission_percent ?? 0).toLocaleString('fa-IR')}٪</span>}</div><button type="button" onClick={() => code && void revoke(code)} disabled={busy || !code} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-red-600 disabled:opacity-50">عزل مقام</button></div> })}</div>
    {activeOrderManager && <div className="space-y-3 border-t pt-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h4 className="font-semibold">دسترسی به خدمات مدیر سفارشات</h4><p className="mt-1 text-xs opacity-70">همه خدمات فعال سایت به‌صورت پیش‌فرض فعال هستند.</p></div><div className="flex gap-2"><button type="button" onClick={() => void setAllServices(true)} disabled={busy} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">فعال کردن همه</button><button type="button" onClick={() => void setAllServices(false)} disabled={busy} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">غیرفعال کردن همه</button></div></div><div className="grid gap-2 md:grid-cols-[1fr_220px]"><input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="جستجوی خدمت..." className="rounded-lg border px-3 py-2" /><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border px-3 py-2">{categories.map(category => <option key={category} value={category}>{category === 'all' ? 'همه دسته‌بندی‌ها' : category}</option>)}</select></div><div className="max-h-80 space-y-1 overflow-auto rounded-lg border p-2">{filteredServices.map(service => { const enabled = isEnabled(service.id); return <label key={service.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2"><span className="min-w-0"><span className="block truncate font-medium">{service.title}</span><span className="block text-xs opacity-60">{service.category}</span></span><input type="checkbox" checked={enabled} disabled={busy || serviceBusy === service.id} onChange={e => void setService(service.id, e.target.checked)} className="h-5 w-5" /></label> })}{filteredServices.length === 0 && <p className="p-5 text-center text-sm opacity-60">خدمتی پیدا نشد.</p>}</div><div className="text-xs opacity-70">{services.filter(s => isEnabled(s.id)).length.toLocaleString('fa-IR')} از {services.length.toLocaleString('fa-IR')} خدمت فعال است.</div></div>}
    {message && <p className="text-sm">{message}</p>}
  </section>
}
