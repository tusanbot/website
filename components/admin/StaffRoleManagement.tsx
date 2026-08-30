'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type StaffRole = 'order_manager' | 'support_operator'

type Assignment = {
  id: string
  user_id: string
  role_id: string
  status: string
  commission_percent: number | null
  staff_roles?: { code: StaffRole; title: string } | null
}

type Service = { id: string; title: string; category: string; is_active: boolean }
type ServiceAccess = { service_id: string; status: string; commission_percent: number | null }

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
    const [{ data: roleData }, { data: serviceData }] = await Promise.all([
      supabase.from('staff_role_assignments').select('id,user_id,role_id,status,commission_percent,staff_roles(code,title)').eq('user_id', userId),
      supabase.from('services').select('id,title,category,is_active').eq('is_active', true).order('title'),
    ])
    setRoles((roleData ?? []) as unknown as Assignment[])
    setServices((serviceData ?? []) as Service[])

    const { data: accessData } = await supabase
      .from('staff_service_access')
      .select('service_id,status,commission_percent')
      .eq('user_id', userId)
    setAccess((accessData ?? []) as ServiceAccess[])
  }

  useEffect(() => { void load() }, [userId])

  const grant = async () => {
    const value = Number(commission)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      setMessage('درصد کارمزد باید بین ۰ تا ۱۰۰ باشد.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.rpc('approve_staff_role', {
        p_user_id: userId,
        p_role_code: selected,
        p_approve: true,
        p_commission: value,
      })
      if (error) throw error
      await load()
      setMessage('مقام با موفقیت اعطا شد. همه خدمات فعال شدند.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'اعطای مقام با خطا مواجه شد.')
    } finally { setBusy(false) }
  }

  const revoke = async (role: StaffRole) => {
    setBusy(true); setMessage('')
    try {
      const { error } = await supabase.rpc('approve_staff_role', { p_user_id: userId, p_role_code: role, p_approve: false, p_commission: 0 })
      if (error) throw error
      await load(); setMessage('مقام لغو شد.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'لغو مقام با خطا مواجه شد.') }
    finally { setBusy(false) }
  }

  const activeAssignment = roles.find(r => r.status === 'approved' && r.staff_roles?.code === 'order_manager')
  const categories = useMemo(() => ['all', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))], [services])
  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    return services.filter(s => (categoryFilter === 'all' || s.category === categoryFilter) && (!q || `${s.title} ${s.category}`.toLowerCase().includes(q)))
  }, [services, serviceSearch, categoryFilter])

  const isEnabled = (serviceId: string) => {
    const row = access.find(a => a.service_id === serviceId)
    return !row || row.status === 'approved'
  }

  const setService = async (serviceId: string, enabled: boolean) => {
    setServiceBusy(serviceId); setMessage('')
    try {
      const { error } = await supabase.rpc('set_staff_service_access', {
        p_user_id: userId,
        p_service_id: serviceId,
        p_approve: enabled,
        p_commission: Number(activeAssignment?.commission_percent ?? commission) || 0,
      })
      if (error) throw error
      await load()
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تغییر دسترسی خدمت با خطا مواجه شد.') }
    finally { setServiceBusy(null) }
  }

  const setAllServices = async (enabled: boolean) => {
    setBusy(true); setMessage('')
    try {
      for (const service of services) {
        const { error } = await supabase.rpc('set_staff_service_access', {
          p_user_id: userId,
          p_service_id: service.id,
          p_approve: enabled,
          p_commission: Number(activeAssignment?.commission_percent ?? commission) || 0,
        })
        if (error) throw error
      }
      await load()
      setMessage(enabled ? 'همه خدمات فعال شدند.' : 'همه خدمات غیرفعال شدند.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تغییر دسترسی همه خدمات با خطا مواجه شد.') }
    finally { setBusy(false) }
  }

  return (
    <section dir="rtl" className="rounded-xl border p-4 space-y-4">
      <div>
        <h3 className="font-semibold">مقام و دسترسی کارکنان</h3>
        <p className="text-sm opacity-70 mt-1">اعطا و لغو مقام فقط از مسیر RPC امن انجام می‌شود.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={selected} onChange={e => setSelected(e.target.value as StaffRole)} className="rounded-lg border px-3 py-2">
          <option value="order_manager">مدیر سفارشات</option>
          <option value="support_operator">اپراتور پشتیبانی</option>
        </select>
        <input value={commission} onChange={e => setCommission(e.target.value)} inputMode="decimal" min="0" max="100" type="number" className="w-24 rounded-lg border px-3 py-2" placeholder="کارمزد %" aria-label="درصد کارمزد" />
        <button type="button" onClick={grant} disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50">{busy ? 'در حال ثبت…' : 'اعطای مقام'}</button>
      </div>
      {roles.length > 0 && <div className="space-y-2">
        {roles.map(role => {
          const code = role.staff_roles?.code
          const title = role.staff_roles?.title ?? (code === 'order_manager' ? 'مدیر سفارشات' : 'اپراتور پشتیبانی')
          return <div key={role.id} className="flex flex-wrap gap-3 items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <span>{title}</span><span>{role.status === 'approved' ? 'تأیید شده' : role.status}</span><span>{role.commission_percent ?? 0}%</span>
            {code && <button type="button" onClick={() => revoke(code)} disabled={busy} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">لغو مقام</button>}
          </div>
        })}
      </div>}
      {activeAssignment && <div className="border-t pt-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div><h4 className="font-semibold">دسترسی به خدمات</h4><p className="text-xs opacity-70 mt-1">به‌صورت پیش‌فرض همه خدمات فعال هستند و می‌توانید هرکدام را جداگانه تغییر دهید.</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => void setAllServices(true)} disabled={busy} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">فعال کردن همه</button><button type="button" onClick={() => void setAllServices(false)} disabled={busy} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">غیرفعال کردن همه</button></div>
        </div>
        <div className="grid md:grid-cols-[1fr_220px] gap-2"><input value={serviceSearch} onChange={e => setServiceSearch(e.target.value)} placeholder="جستجوی خدمت..." className="rounded-lg border px-3 py-2" /><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-lg border px-3 py-2">{categories.map(category => <option key={category} value={category}>{category === 'all' ? 'همه دسته‌بندی‌ها' : category}</option>)}</select></div>
        <div className="max-h-80 overflow-auto space-y-1 rounded-lg border p-2">{filteredServices.map(service => { const enabled = isEnabled(service.id); return <label key={service.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-black/5 cursor-pointer"><span className="min-w-0"><span className="block truncate font-medium">{service.title}</span><span className="block text-xs opacity-60">{service.category}</span></span><input type="checkbox" checked={enabled} disabled={busy || serviceBusy === service.id} onChange={e => void setService(service.id, e.target.checked)} className="h-5 w-5" /></label> })}{filteredServices.length === 0 && <p className="p-5 text-center text-sm opacity-60">خدمتی پیدا نشد.</p>}</div>
        <div className="text-xs opacity-70">{services.filter(s => isEnabled(s.id)).length.toLocaleString('fa-IR')} از {services.length.toLocaleString('fa-IR')} خدمت فعال است.</div>
      </div>}
      {message && <p className="text-sm">{message}</p>}
    </section>
  )
}
