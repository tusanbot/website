-- Add conditional pricing for the housing deposit loan service.
-- When the customer requests lease-contract registration, the Self-Writing service
-- charge is added to the base loan service price.
update public.services
set pricing_rules = jsonb_build_array(
  jsonb_build_object(
    'id', 'rent_contract_service',
    'field', 'needs_rent_contract',
    'operator', 'is_true',
    'value', true,
    'mode', 'add',
    'amount', 780000,
    'label', 'ثبت قرارداد اجاره در سامانه خودنویس',
    'enabled', true
  )
)
where title = 'وام ودیعه مسکن';
