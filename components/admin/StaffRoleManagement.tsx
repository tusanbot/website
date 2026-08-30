'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type StaffRole = 'order_manager' | 'support_operator'

type Assignment = {
  id: string
  user_id: string
  role_key: StaffRole
  status: string
}

export default function StaffRoleManagement({ userId }: { userId: string }) {
  const supabase = createClient()
  const [roles, setRoles] = useState<Assignment[]>([])
  const [selected, setSelected] = useState<StaffRole>('order_manager')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('staff_role_assignments')
        .select('id,user_id,role_key,status')
        .eq('user_id', userId)
      if (active && !error) setRoles((data ?? []) as Assignment[])
    })()
    return () => { active = false }
  }, [userId])

  const grant = async () => {
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await supabase.rpc('approve_staff_role', {
        p_user_id: userId,
        p_role_key: selected,
      })
      if (error) throw error
      setMessage('مقام با موفقیت ثبت شد.')
      const { data: refreshed } = await supabase
        .from('staff_role_assignments')
        .select('id,user_id,role_key,status')
        .eq('user_id', userId)
      setRoles((refreshed ?? data ?? []) as Assignment[])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'ثبت مقام با خطا مواجه شد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section dir="rtl" className="rounded-xl border p-4 space-y-4">
      <div>
        <h3 className="font-semibold">مقام و دسترسی کارکنان</h3>
        <p className="text-sm opacity-70 mt-1">اعطای مقام فقط از مسیر RPC امن انجام می‌شود.</p>
      </div>
      <div className="flex gap-2 items-center">
        <select value={selected} onChange={e => setSelected(e.target.value as StaffRole)} className="rounded-lg border px-3 py-2">
          <option value="order_manager">مدیر سفارشات</option>
          <option value="support_operator">اپراتور پشتیبانی</option>
        </select>
        <button type="button" onClick={grant} disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50">
          {busy ? 'در حال ثبت…' : 'اعطای مقام'}
        </button>
      </div>
      {roles.length > 0 && (
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{role.role_key === 'order_manager' ? 'مدیر سفارشات' : 'اپراتور پشتیبانی'}</span>
              <span>{role.status === 'approved' ? 'تأیید شده' : role.status}</span>
            </div>
          ))}
        </div>
      )}
      {message && <p className="text-sm">{message}</p>}
    </section>
  )
}
