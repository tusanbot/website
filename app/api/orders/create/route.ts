import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { validateFormData } from '@/lib/forms/server-validation';
import { calculateServicePrice, type PricingRule } from '@/lib/forms/pricing';
import { MAX_ORDER_BODY_BYTES, validateFormDataShape } from '@/lib/security/request-limits';
import type { FormSchema } from '@/types/forms';

function normalizeSchema(value: unknown): FormSchema {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (Array.isArray(parsed)) return { fields: parsed as FormSchema['fields'] };
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { fields?: unknown }).fields)) {
    return parsed as FormSchema;
  }
  return { fields: [] };
}

function normalizeRules(value: unknown): PricingRule[] {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = []; }
  }
  return Array.isArray(value) ? value as PricingRule[] : [];
}

function mergeSchemas(parent: FormSchema, child: FormSchema): FormSchema {
  const fields = [...parent.fields, ...child.fields];
  const seen = new Set<string>();
  const unique = fields.filter((field: any) => {
    if (!field || typeof field !== 'object') return false;
    const key = String(field.name || field.id || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...child, fields: unique };
}

function generateTrackingCode(): string {
  return `TUS-${Date.now().toString().slice(-6)}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > MAX_ORDER_BODY_BYTES) throw new Error('REQUEST_BODY_TOO_LARGE');
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_ORDER_BODY_BYTES) throw new Error('REQUEST_BODY_TOO_LARGE');
  return JSON.parse(new TextDecoder().decode(body));
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'برای ثبت سفارش ابتدا وارد حساب شوید.' }, { status: 401 });

    const body = await readBoundedJson(request) as {
      serviceId?: string;
      formId?: string | null;
      formData?: Record<string, unknown>;
      idempotencyKey?: string;
    };
    if (!body.serviceId || !body.formData || typeof body.formData !== 'object' || Array.isArray(body.formData)) {
      return NextResponse.json({ error: 'اطلاعات فرم ناقص است.' }, { status: 400 });
    }
    if (!validateFormDataShape(body.formData)) {
      return NextResponse.json({ error: 'حجم یا ساختار اطلاعات فرم نامعتبر است.' }, { status: 413 });
    }

    const idempotencyKey = String(body.idempotencyKey || request.headers.get('x-idempotency-key') || '').trim();
    if (idempotencyKey.length > 128) return NextResponse.json({ error: 'شناسه تکرارنشدنی نامعتبر است.' }, { status: 400 });

    if (idempotencyKey) {
      const { data: existingOrder, error: existingOrderError } = await supabase
        .from('orders').select('id,tracking_code,price,form_version_id').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existingOrderError) throw new Error(existingOrderError.message);
      if (existingOrder) return NextResponse.json({ order: existingOrder, idempotent: true });
    }

    const { data: service, error: serviceError } = await supabase
      .from('services').select('id,title,price,form_schema,is_active,parent_service_id,parent_form_id,pricing_rules').eq('id', body.serviceId).eq('is_active', true).maybeSingle();
    if (serviceError) throw new Error(serviceError.message);
    if (!service) return NextResponse.json({ error: 'خدمت انتخاب‌شده در دسترس نیست.' }, { status: 404 });

    let schema = normalizeSchema(service.form_schema);
    let formId: string | null = body.formId ?? null;
    let formVersionId: string | null = null;
    let orderPrice = Number(service.price || 0);
    const pricingRules = normalizeRules(service.pricing_rules);

    if (!formId) {
      const { data: inferredForm, error: inferredFormError } = await supabase.from('custom_forms')
        .select('id,schema,service_id,is_public,price,active_version_id,parent_form_id,form_type').eq('service_id', service.id).eq('is_public', true)
        .in('form_type', ['normal', 'parent']).order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (inferredFormError) throw new Error(inferredFormError.message);
      if (inferredForm) {
        formId = inferredForm.id; schema = normalizeSchema(inferredForm.schema); orderPrice = Number(inferredForm.price ?? service.price ?? 0);
        if (inferredForm.active_version_id) {
          const { data: version, error: versionError } = await supabase.from('form_versions').select('id,schema,price').eq('id', inferredForm.active_version_id).eq('form_id', inferredForm.id).maybeSingle();
          if (versionError) throw new Error(versionError.message);
          if (!version) return NextResponse.json({ error: 'نسخه فعال فرم پیدا نشد.' }, { status: 409 });
          formVersionId = version.id; schema = normalizeSchema(version.schema); orderPrice = Number(version.price ?? orderPrice);
        }
        const parentFormId = inferredForm.parent_form_id || service.parent_form_id || null;
        if (parentFormId) {
          const { data: parentForm, error: parentError } = await supabase.from('custom_forms').select('id,schema,service_id,is_public,active_version_id').eq('id', parentFormId).eq('is_public', true).maybeSingle();
          if (parentError) throw new Error(parentError.message);
          if (parentForm) {
            let parentSchema = normalizeSchema(parentForm.schema);
            if (parentForm.active_version_id) {
              const { data: parentVersion, error: parentVersionError } = await supabase.from('form_versions').select('id,schema').eq('id', parentForm.active_version_id).eq('form_id', parentForm.id).maybeSingle();
              if (parentVersionError) throw new Error(parentVersionError.message);
              if (!parentVersion) return NextResponse.json({ error: 'نسخه فعال فرم مادر پیدا نشد.' }, { status: 409 });
              parentSchema = normalizeSchema(parentVersion.schema);
            }
            schema = mergeSchemas(parentSchema, schema);
          }
        }
      }
    }

    if (formId) {
      const { data: customForm, error: formError } = await supabase.from('custom_forms').select('id,schema,service_id,is_public,price,active_version_id,parent_form_id').eq('id', formId).eq('service_id', service.id).eq('is_public', true).maybeSingle();
      if (formError) throw new Error(formError.message);
      if (!customForm) return NextResponse.json({ error: 'فرم انتخاب‌شده معتبر نیست.' }, { status: 400 });
      formId = customForm.id; orderPrice = Number(customForm.price ?? service.price ?? 0); schema = normalizeSchema(customForm.schema);
      if (customForm.active_version_id) {
        const { data: version, error: versionError } = await supabase.from('form_versions').select('id,schema,price').eq('id', customForm.active_version_id).eq('form_id', customForm.id).maybeSingle();
        if (versionError) throw new Error(versionError.message);
        if (!version) return NextResponse.json({ error: 'نسخه فعال فرم پیدا نشد.' }, { status: 409 });
        formVersionId = version.id; schema = normalizeSchema(version.schema); orderPrice = Number(version.price ?? orderPrice);
      }
      const parentFormId = customForm.parent_form_id || service.parent_form_id || null;
      if (parentFormId) {
        const { data: parentForm, error: parentError } = await supabase.from('custom_forms').select('id,schema,service_id,is_public,active_version_id').eq('id', parentFormId).eq('is_public', true).maybeSingle();
        if (parentError) throw new Error(parentError.message);
        if (parentForm) {
          let parentSchema = normalizeSchema(parentForm.schema);
          if (parentForm.active_version_id) {
            const { data: parentVersion, error: parentVersionError } = await supabase.from('form_versions').select('id,schema').eq('id', parentForm.active_version_id).eq('form_id', parentForm.id).maybeSingle();
            if (parentVersionError) throw new Error(parentVersionError.message);
            if (!parentVersion) return NextResponse.json({ error: 'نسخه فعال فرم مادر پیدا نشد.' }, { status: 409 });
            parentSchema = normalizeSchema(parentVersion.schema);
          }
          schema = mergeSchemas(parentSchema, schema);
        }
      }
    }

    const validation = validateFormData(schema, body.formData);
    if (!validation.valid) return NextResponse.json({ error: 'اطلاعات فرم کامل یا معتبر نیست.', errors: validation.errors }, { status: 422 });

    const finalPrice = calculateServicePrice(orderPrice, pricingRules, validation.data as Record<string, unknown>);
    const { data: order, error: orderError } = await supabase.from('orders').insert({ user_id: user.id, service_id: service.id, form_id: formId, form_version_id: formVersionId, idempotency_key: idempotencyKey || null, tracking_code: generateTrackingCode(), status: 'registered', form_data: validation.data, form_schema_snapshot: schema, price: finalPrice }).select('id,tracking_code,price,form_version_id').single();
    if (orderError) {
      if (orderError.code === '23505' && idempotencyKey) {
        const { data: concurrentOrder } = await supabase.from('orders').select('id,tracking_code,price,form_version_id').eq('user_id', user.id).eq('idempotency_key', idempotencyKey).maybeSingle();
        if (concurrentOrder) return NextResponse.json({ order: concurrentOrder, idempotent: true });
      }
      throw new Error(orderError.message);
    }
    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === 'REQUEST_BODY_TOO_LARGE') return NextResponse.json({ error: 'حجم درخواست بیش از حد مجاز است.' }, { status: 413 });
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'خطایی هنگام ثبت سفارش رخ داد.' }, { status: 500 });
  }
}
