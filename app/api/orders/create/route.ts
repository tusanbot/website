import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { validateFormData } from '@/lib/forms/server-validation';
import type { FormSchema } from '@/types/forms';

function normalizeSchema(value: unknown): FormSchema {
  let parsed = value;
  if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { parsed = []; } }
  if (Array.isArray(parsed)) return { fields: parsed as FormSchema['fields'] };
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { fields?: unknown }).fields)) return parsed as FormSchema;
  return { fields: [] };
}
function generateTrackingCode(): string { return `TUS-${Date.now().toString().slice(-6)}-${Math.floor(100000 + Math.random() * 900000)}`; }

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'برای ثبت سفارش ابتدا وارد حساب شوید.' }, { status: 401 });
    const body = await request.json() as { serviceId?: string; formId?: string | null; formData?: Record<string, unknown> };
    if (!body.serviceId || !body.formData || typeof body.formData !== 'object' || Array.isArray(body.formData)) return NextResponse.json({ error: 'اطلاعات فرم ناقص است.' }, { status: 400 });

    const { data: service, error: serviceError } = await supabase.from('services').select('id,title,price,form_schema,is_active,parent_service_id').eq('id', body.serviceId).eq('is_active', true).maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service) return NextResponse.json({ error: 'خدمت انتخاب‌شده در دسترس نیست.' }, { status: 404 });

    let schema = normalizeSchema(service.form_schema);
    let formId: string | null = body.formId ?? null;
    let formVersionId: string | null = null;
    let orderPrice = Number(service.price || 0);

    if (formId) {
      const { data: customForm, error: formError } = await supabase.from('custom_forms').select('id,schema,service_id,is_public,price,active_version_id').eq('id', formId).eq('service_id', service.id).eq('is_public', true).maybeSingle();
      if (formError) throw new Error(formError.message);
      if (!customForm) return NextResponse.json({ error: 'فرم انتخاب‌شده معتبر نیست.' }, { status: 400 });
      formId = customForm.id;
      orderPrice = Number(customForm.price ?? service.price ?? 0);
      if (customForm.active_version_id) {
        const { data: version, error: versionError } = await supabase.from('form_versions').select('id,schema,price').eq('id', customForm.active_version_id).eq('form_id', customForm.id).maybeSingle();
        if (versionError) throw new Error(versionError.message);
        if (!version) return NextResponse.json({ error: 'نسخه فعال فرم پیدا نشد.' }, { status: 409 });
        formVersionId = version.id;
        schema = normalizeSchema(version.schema);
        orderPrice = Number(version.price ?? orderPrice);
      } else {
        schema = normalizeSchema(customForm.schema);
      }
    }

    const validation = validateFormData(schema, body.formData);
    if (!validation.valid) return NextResponse.json({ error: 'اطلاعات فرم کامل یا معتبر نیست.', errors: validation.errors }, { status: 422 });

    const { data: order, error: orderError } = await supabase.from('orders').insert({ user_id: user.id, service_id: service.id, form_id: formId, form_version_id: formVersionId, tracking_code: generateTrackingCode(), status: 'registered', form_data: validation.data, form_schema_snapshot: schema, price: orderPrice }).select('id,tracking_code,price,form_version_id').single();
    if (orderError) throw new Error(orderError.message);
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'خطایی هنگام ثبت سفارش رخ داد.' }, { status: 500 });
  }
}
