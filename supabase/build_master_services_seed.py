from pathlib import Path
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
SUPABASE = ROOT / "supabase"
PHASES = [
    SUPABASE / "tusan_services_phase1_complete.sql",
    SUPABASE / "tusan_services_phase2.sql",
    SUPABASE / "tusan_services_phase3.sql",
    SUPABASE / "tusan_services_phase4.sql",
    SUPABASE / "tusan_services_phase5.sql",
]
OUTPUT = SUPABASE / "tusan_services_master.sql"


def normalize_title(value: str) -> str:
    value = unicodedata.normalize("NFC", str(value or "")).strip()
    return re.sub(r"\s+", " ", value)


def extract_payload(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"\$services\$(.*?)\$services\$::jsonb", text, re.S)
    if not match:
        raise RuntimeError(f"No $services$ JSON payload found in {path}")
    data = json.loads(match.group(1))
    if not isinstance(data, list):
        raise RuntimeError(f"Service payload is not a JSON array: {path}")
    return data


services: list[dict] = []
seen: dict[str, str] = {}
duplicates: list[tuple[str, str, str]] = []

for phase in PHASES:
    for raw in extract_payload(phase):
        title = normalize_title(raw.get("title"))
        if not title:
            raise RuntimeError(f"Empty service title in {phase}")

        schema = raw.get("form_schema")
        if schema is None:
            schema = raw.get("fields")
        if not isinstance(schema, list):
            raise RuntimeError(f"Missing/invalid form schema for {title} in {phase}")

        item = {
            "title": title,
            "category": raw.get("category"),
            "description": raw.get("description"),
            "icon": raw.get("icon"),
            "form_schema": schema,
        }

        key = title.casefold()
        if key in seen:
            duplicates.append((title, seen[key], phase.name))
            continue

        seen[key] = phase.name
        services.append(item)

payload = json.dumps(services, ensure_ascii=False, indent=2)

lines = [
    "-- Tusan Website - MASTER services/custom_forms seed",
    "-- Generated deterministically from Phase 1-5 seed catalogs.",
    "-- Supabase SQL Editor compatible: no psql meta-commands and no file includes.",
    "-- Idempotent by normalized service/form title.",
    "-- Duplicate catalog entries are resolved by first appearance (Phase 1 > Phase 2 > Phase 3 > Phase 4 > Phase 5).",
    "--",
    "-- Duplicate catalog entries removed during generation:",
]

if duplicates:
    for title, kept_in, removed_in in duplicates:
        lines.append(f"--   {title}: kept {kept_in}; removed duplicate from {removed_in}")
else:
    lines.append("--   none")

lines.extend(
    [
        "",
        "BEGIN;",
        "",
        "-- Align the two hierarchy tables used by the current admin/form flow.",
        "ALTER TABLE public.services ADD COLUMN IF NOT EXISTS parent_service_id uuid NULL;",
        "ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'normal';",
        "ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS parent_form_id uuid NULL;",
        "ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS service_id uuid NULL;",
        "ALTER TABLE public.custom_forms ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;",
        "",
        "DO $$",
        "BEGIN",
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_forms_form_type_check') THEN",
        "    ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_form_type_check CHECK (form_type IN ('normal', 'parent'));",
        "  END IF;",
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_forms_parent_form_id_fkey') THEN",
        "    ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_parent_form_id_fkey FOREIGN KEY (parent_form_id) REFERENCES public.custom_forms(id) ON DELETE CASCADE;",
        "  END IF;",
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_forms_service_id_fkey') THEN",
        "    ALTER TABLE public.custom_forms ADD CONSTRAINT custom_forms_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;",
        "  END IF;",
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_parent_service_id_fkey') THEN",
        "    ALTER TABLE public.services ADD CONSTRAINT services_parent_service_id_fkey FOREIGN KEY (parent_service_id) REFERENCES public.services(id) ON DELETE SET NULL;",
        "  END IF;",
        "END $$;",
        "",
        "CREATE INDEX IF NOT EXISTS idx_custom_forms_service_id ON public.custom_forms(service_id);",
        "CREATE INDEX IF NOT EXISTS idx_custom_forms_parent_form_id ON public.custom_forms(parent_form_id);",
        "CREATE INDEX IF NOT EXISTS idx_services_parent_service_id ON public.services(parent_service_id);",
        "",
        "-- Canonical service/form seed.",
        "-- Every catalog service is a standalone service with one normal form.",
        "-- Future mother/child variants can be added without changing this seed: a parent custom_form",
        "-- uses form_type='parent', parent_form_id=NULL, and children point to that parent and same service_id.",
        "DO $$",
        "DECLARE",
        "  item jsonb;",
        "  v_service_id uuid;",
        "  v_form_id uuid;",
        "BEGIN",
        "  FOR item IN SELECT value FROM jsonb_array_elements($seed$",
        payload,
        "$seed$::jsonb) LOOP",
        "    SELECT id INTO v_service_id",
        "    FROM public.services",
        "    WHERE lower(trim(title)) = lower(trim(item->>'title'))",
        "    ORDER BY created_at NULLS FIRST, id",
        "    LIMIT 1;",
        "",
        "    IF v_service_id IS NULL THEN",
        "      INSERT INTO public.services",
        "        (title, category, description, price, icon, is_active, form_schema, parent_service_id)",
        "      VALUES",
        "        (item->>'title', item->>'category', item->>'description', 0, NULLIF(item->>'icon',''), true, item->'form_schema', NULL)",
        "      RETURNING id INTO v_service_id;",
        "    ELSE",
        "      UPDATE public.services",
        "      SET category = item->>'category',",
        "          description = item->>'description',",
        "          icon = NULLIF(item->>'icon',''),",
        "          is_active = true,",
        "          form_schema = item->'form_schema'",
        "      WHERE id = v_service_id;",
        "    END IF;",
        "",
        "    SELECT id INTO v_form_id",
        "    FROM public.custom_forms",
        "    WHERE service_id = v_service_id",
        "      AND parent_form_id IS NULL",
        "      AND lower(trim(title)) = lower(trim(item->>'title'))",
        "    ORDER BY created_at NULLS FIRST, id",
        "    LIMIT 1;",
        "",
        "    IF v_form_id IS NULL THEN",
        "      INSERT INTO public.custom_forms",
        "        (title, description, schema, created_by, is_public, form_type, parent_form_id, service_id, sort_order)",
        "      VALUES",
        "        (item->>'title', item->>'description', item->'form_schema', NULL, true, 'normal', NULL, v_service_id, 0);",
        "    ELSE",
        "      UPDATE public.custom_forms",
        "      SET description = item->>'description',",
        "          schema = item->'form_schema',",
        "          is_public = true,",
        "          form_type = 'normal',",
        "          service_id = v_service_id,",
        "          sort_order = 0",
        "      WHERE id = v_form_id;",
        "    END IF;",
        "  END LOOP;",
        "END $$;",
        "",
        "COMMIT;",
        "",
        "-- Validation: this should return zero rows for the canonical seed catalog.",
        "SELECT lower(trim(title)) AS normalized_title, count(*) AS service_count",
        "FROM public.services",
        "GROUP BY lower(trim(title))",
        "HAVING count(*) > 1",
        "ORDER BY service_count DESC, normalized_title;",
        "",
        "-- Validation: every canonical service should have a matching standalone normal form.",
        "SELECT s.title",
        "FROM public.services s",
        "LEFT JOIN public.custom_forms f",
        "  ON f.service_id = s.id",
        " AND f.parent_form_id IS NULL",
        " AND f.form_type = 'normal'",
        " AND lower(trim(f.title)) = lower(trim(s.title))",
        "WHERE s.is_active = true",
        "  AND f.id IS NULL",
        "ORDER BY s.title;",
    ]
)

OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Generated {OUTPUT} with {len(services)} unique services and {len(duplicates)} duplicate catalog entries removed.")
