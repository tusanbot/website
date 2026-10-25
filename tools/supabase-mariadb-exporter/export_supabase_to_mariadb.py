#!/usr/bin/env python3
"""Read-only Supabase public-schema exporter to MariaDB-oriented SQL files.
Requires Python 3.10+ and: python -m pip install "psycopg[binary]"
Run: python export_supabase_to_mariadb.py ./tosan_sql_export
"""
import os, sys, json, getpass, zipfile
from pathlib import Path
from datetime import date, datetime, time
from decimal import Decimal
try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    raise SystemExit('Install: python -m pip install "psycopg[binary]"')

GROUPS = {
 "01_services_forms.sql": {"services","custom_forms","form_versions","registrations","services_announcements"},
 "02_orders_payments.sql": {"orders","payments","order_files","order_history","order_cancellation_requests","order_commission_ledger","order_refunds","order_staff_requests","discount_codes","discount_services","discount_tag_rules","discount_usages","discounts","financial_transactions","social_orders"},
 "03_blog.sql": {"blog_categories","blog_comments","blog_post_services","blog_posts","blog_ratings","blog_reactions"},
 "04_profiles_staff.sql": {"profiles","staff_bank_accounts","staff_category_access","staff_earnings","staff_financial_adjustments","staff_reviews","staff_role_assignments","staff_roles","staff_service_access","staff_settlements","payout_requests","member_tag_assignments","member_tags"},
 "05_support_messages.sql": {"ai_profiles","ai_sessions","messages","notifications","support_conversation_participants","support_conversations","support_faqs","support_messages","support_reviews"},
 "06_social_integrations.sql": {"social_categories","social_platforms","social_services","social_sync_logs","tag_referral_links","traxtor_saved_projects"},
 "07_settings_misc.sql": {"api_rate_limits","goals","news_announcements","news_sources","site_settings","sub_goals"},
}
def qi(s):
    q=chr(96)
    return q+s.replace(q,q+q)+q
def sval(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (dict,list)): v=json.dumps(v,ensure_ascii=False,separators=(",",":"),default=str)
    elif isinstance(v, datetime): v=v.isoformat(sep=" ")
    elif isinstance(v, (date,time)): v=v.isoformat()
    elif isinstance(v, Decimal): return str(v)
    elif isinstance(v, (int,float)): return repr(v)
    elif isinstance(v, (bytes,bytearray,memoryview)): return "X'"+bytes(v).hex()+"'"
    elif not isinstance(v,str): v=str(v)
    return "'" + v.replace("\\","\\\\").replace("\x00","").replace("'","''") + "'"
def mtype(c):
    t=(c["data_type"] or "").lower()
    if t=="uuid": return "CHAR(36)"
    if t in ("json","jsonb","array"): return "JSON"
    if t=="boolean": return "TINYINT(1)"
    if t=="smallint": return "SMALLINT"
    if t=="integer": return "INT"
    if t=="bigint": return "BIGINT"
    if t in ("numeric","decimal"): return "DECIMAL(%s,%s)" % (c["numeric_precision"] or 38,c["numeric_scale"] or 0)
    if t=="real": return "FLOAT"
    if t=="double precision": return "DOUBLE"
    if t=="date": return "DATE"
    if t.startswith("time "): return "TIME"
    if t.startswith("timestamp "): return "DATETIME(6)"
    if t=="bytea": return "LONGBLOB"
    if t=="character varying": return "VARCHAR(%d)" % min(c["character_maximum_length"] or 255,16383)
    if t=="character": return "CHAR(%d)" % min(c["character_maximum_length"] or 1,255)
    if t in ("text","xml"): return "LONGTEXT"
    if t=="user-defined": return "VARCHAR(255)"
    return "LONGTEXT"
def main():
    url=os.environ.get("SUPABASE_DB_URL") or getpass.getpass("Supabase PostgreSQL connection string (hidden): ").strip()
    if not url: raise SystemExit("No connection string supplied.")
    out=Path(sys.argv[1] if len(sys.argv)>1 else "tosan_sql_export").resolve()
    out.mkdir(parents=True,exist_ok=True)
    with psycopg.connect(url,connect_timeout=20,row_factory=dict_row) as con:
      with con.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")
        tables=[r["table_name"] for r in cur.fetchall()]
        if not tables: raise SystemExit("No public tables found; check connection and permissions.")
        meta={}; pks={}; uniques={}
        for t in tables:
          cur.execute("""SELECT column_name,data_type,udt_name,character_maximum_length,numeric_precision,numeric_scale,is_nullable,ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position""",(t,))
          meta[t]=cur.fetchall()
          cur.execute("""SELECT a.attname AS col FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN unnest(i.indkey) WITH ORDINALITY k(attnum,ord) ON true JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum WHERE n.nspname='public' AND c.relname=%s AND i.indisprimary ORDER BY k.ord""",(t,))
          pks[t]=[r["col"] for r in cur.fetchall()]
          cur.execute("""SELECT con.conname,array_agg(a.attname ORDER BY k.ord) cols FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN unnest(con.conkey) WITH ORDINALITY k(attnum,ord) ON true JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum WHERE n.nspname='public' AND c.relname=%s AND con.contype='u' GROUP BY con.conname""",(t,))
          uniques[t]=cur.fetchall()
        cur.execute("""SELECT con.conname,s.relname src,array_agg(sa.attname ORDER BY sk.ord) scols,d.relname dst,array_agg(da.attname ORDER BY dk.ord) dcols FROM pg_constraint con JOIN pg_class s ON s.oid=con.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace JOIN pg_class d ON d.oid=con.confrelid JOIN pg_namespace dn ON dn.oid=d.relnamespace JOIN unnest(con.conkey) WITH ORDINALITY sk(attnum,ord) ON true JOIN pg_attribute sa ON sa.attrelid=s.oid AND sa.attnum=sk.attnum JOIN unnest(con.confkey) WITH ORDINALITY dk(attnum,ord) ON dk.ord=sk.ord JOIN pg_attribute da ON da.attrelid=d.oid AND da.attnum=dk.attnum WHERE con.contype='f' AND sn.nspname='public' AND dn.nspname='public' GROUP BY con.conname,s.relname,d.relname ORDER BY s.relname,con.conname""")
        fks=cur.fetchall()
        schema=["-- MariaDB-oriented schema export; review before production use.","SET NAMES utf8mb4;","SET FOREIGN_KEY_CHECKS=0;"]
        for t in tables:
          defs=[]
          for c in meta[t]:
            null=" NULL" if c["is_nullable"]=="YES" else " NOT NULL"
            defs.append("  "+qi(c["column_name"])+" "+mtype(c)+null)
          if pks[t]: defs.append("  PRIMARY KEY ("+", ".join(qi(x) for x in pks[t])+")")
          for u in uniques[t]:
            defs.append("  UNIQUE KEY "+qi(("uq_"+u["conname"])[:60])+" ("+", ".join(qi(x) for x in u["cols"])+")")
          schema.append("CREATE TABLE IF NOT EXISTS "+qi(t)+" (\n"+",\n".join(defs)+"\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n")
        schema.append("SET FOREIGN_KEY_CHECKS=1;")
        (out/"00_schema.sql").write_text("\n".join(schema)+"\n",encoding="utf-8")
        file_tables={name:[] for name in GROUPS}; file_tables["08_other_tables.sql"]=[]
        for t in tables:
          filename=next((fn for fn,names in GROUPS.items() if t in names),"08_other_tables.sql")
          file_tables[filename].append(t)
        counts={}
        for filename,ts in file_tables.items():
          lines=["-- Data only. Import 00_schema.sql first.","SET NAMES utf8mb4;","SET FOREIGN_KEY_CHECKS=0;","START TRANSACTION;"]
          for t in ts:
            cols=[c["column_name"] for c in meta[t]]
            cur.execute("SELECT * FROM public."+qi(t))
            rows=cur.fetchall(); counts[t]=len(rows)
            if not rows:
              lines.append("-- "+t+": 0 rows; table is created in 00_schema.sql."); continue
            csql=", ".join(qi(c) for c in cols); batch=[]
            for row in rows:
              batch.append("("+", ".join(sval(row[c]) for c in cols)+")")
              if len(batch)>=100:
                lines.append("INSERT INTO "+qi(t)+" ("+csql+") VALUES\n"+",\n".join(batch)+";\n"); batch=[]
            if batch: lines.append("INSERT INTO "+qi(t)+" ("+csql+") VALUES\n"+",\n".join(batch)+";\n")
            lines.append("-- "+t+": exported "+str(len(rows))+" rows.")
          lines += ["COMMIT;","SET FOREIGN_KEY_CHECKS=1;"]
          (out/filename).write_text("\n".join(lines)+"\n",encoding="utf-8")
        fklines=["-- Import after schema and all data files.","SET FOREIGN_KEY_CHECKS=0;"]
        for f in fks:
          fklines.append("ALTER TABLE "+qi(f["src"])+" ADD CONSTRAINT "+qi(("fk_"+f["conname"])[:60])+" FOREIGN KEY ("+", ".join(qi(x) for x in f["scols"])+") REFERENCES "+qi(f["dst"])+" ("+", ".join(qi(x) for x in f["dcols"])+");")
        fklines.append("SET FOREIGN_KEY_CHECKS=1;")
        (out/"09_foreign_keys.sql").write_text("\n".join(fklines)+"\n",encoding="utf-8")
        (out/"manifest.json").write_text(json.dumps({"table_count":len(tables),"total_rows":sum(counts.values()),"rows_by_table":counts},ensure_ascii=False,indent=2),encoding="utf-8")
        (out/"README.md").write_text("Import into a NEW empty MariaDB database only: 00_schema.sql, data files 01 through 08, then 09_foreign_keys.sql. Check manifest.json and compare destination counts. This exports public base-table data only; it does not migrate auth/storage, storage objects, RLS policies, triggers, routines, grants, PostgreSQL defaults/check constraints, or every PostgreSQL-specific behavior. Test before cutover. Never import over tusancni_main.\n",encoding="utf-8")
        zip_path=out.with_suffix(".zip")
        with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
          for p in sorted(out.iterdir()): z.write(p,arcname=out.name+"/"+p.name)
        print("Exported %d tables and %d rows."%(len(tables),sum(counts.values())))
        print("SQL directory:",out,"\nZIP:",zip_path,"\nSource Supabase was not modified.")
if __name__=="__main__": main()
