'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type StaffRole = 'order_manager' | 'support_operator'

type Assignment = {
  id: string
  user_id: string
  role_id: string
  status: string
  commission_percent: number | null
  staff_roles?: { code: StaffRole; title: string } | null
}

export default function StaffRoleManagement({ userId }: { userId: string }) {
  const supabase = createClient()
  const [roles, setRoles] = useState<Assignment[]>([])
  const [selected, setSelected] = useState<StaffRole>('order_manager')
  const [commission, setCommission] = useState('0')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const load = async () => {
    const { data, error } = await supabase
      .from('staff_role_assignments')
      .select('id,user_id,role_id,status,commission_percent,staff_roles(code,title)')
      .eq('user_id', userId)
    if (!error) setRoles((data ?? []) as unknown as Assignment[])
  }

  useEffect(() => {
    void load()
  }, [userId])

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
      setMessage('مقام با موفقیت اعطا شد.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'اعطای مقام با خطا مواجه شد.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (role: StaffRole) => {
    setBusy(true)
    setMessage('')
    try {
      const { error } = await supabase.rpc('approve_staff_role', {
        p_user_id: userId,
        p_role_code: role,
        p_approve: false,
        p_commission: 0,
      })
      if (error) throw error
      await load()
      setMessage('مقام لغو شد.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'لغو مقام با خطا مواجه شد.')
    } finally {
      setBusy(false)
    }
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
        <input
          value={commission}
          onChange={e => setCommission(e.target.value)}
          inputMode="decimal"
          min="0"
          max="100"
          type="number"
          className="w-24 rounded-lg border px-3 py-2"
          placeholder="کارمزد %"
          aria-label="درصد کارمزد"
        />
        <button type="button" onClick={grant} disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50">
          {busy ? 'در حال ثبت…' : 'اعطای مقام'}
        </button>
      </div>
      {roles.length > 0 && (
        <div className="space-y-2">
          {roles.map(role => {
            const code = role.staff_roles?.code
            const title = role.staff_roles?.title ?? (code === 'order_manager' ? 'مدیر سفارشات' : 'اپراتور پشتیبانی')
            return (
              <div key={role.id} className="flex flex-wrap gap-3 items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{title}</span>
                <span>{role.status === 'approved' ? 'تأیید شده' : role.status}</span>
                <span>{role.commission_percent ?? 0}%</span>
                {code && (
                  <button type="button" onClick={() => revoke(code)} disabled={busy} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">
                    لغو مقام
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </section>
  )
}
