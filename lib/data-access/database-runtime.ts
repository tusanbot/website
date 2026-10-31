import "server-only";

export type DataProvider = "supabase" | "mysql";
export type DataMode = DataProvider | "dual";
export type DataDomain = "blogAdmin" | "announcements";

export type DomainDataRuntime = {
  mode: DataMode;
  primary: DataProvider;
  syncTarget: DataProvider | null;
};

export type DataRuntime = {
  mode: DataMode;
  domains: Record<DataDomain, DomainDataRuntime>;
};

type RuntimeEnvironment = Record<string, string | undefined>;

function parseMode(value: string | undefined): DataMode {
  const normalized = (value || "supabase").trim().toLowerCase();
  if (normalized === "supabase" || normalized === "mysql" || normalized === "dual") return normalized;
  throw new Error("TUSAN_DATA_MODE must be one of: supabase, mysql, dual.");
}

function parseProvider(value: string | undefined, fallback: DataProvider): DataProvider {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "supabase" || normalized === "mysql") return normalized;
  throw new Error("Database provider must be either supabase or mysql.");
}

function opposite(provider: DataProvider): DataProvider {
  return provider === "supabase" ? "mysql" : "supabase";
}

/**
 * Resolves server-side data routing without opening either database connection.
 * In dual mode each domain has one authoritative provider and a mirror target.
 * The mirror must be implemented with a durable transactional outbox; this
 * resolver deliberately does not perform unsafe synchronous dual writes.
 */
export function resolveDataRuntime(env: RuntimeEnvironment = process.env): DataRuntime {
  const mode = parseMode(env.TUSAN_DATA_MODE);
  const defaultPrimary: DataProvider = mode === "mysql" ? "mysql" : "supabase";
  const configuredPrimary = parseProvider(env.TUSAN_DATA_PRIMARY, defaultPrimary);

  if (mode !== "dual" && configuredPrimary !== defaultPrimary) {
    throw new Error("TUSAN_DATA_PRIMARY conflicts with TUSAN_DATA_MODE.");
  }

  const configuredTarget = env.TUSAN_DATA_SYNC_TARGET?.trim().toLowerCase();
  let syncTarget: DataProvider | null = null;

  if (mode === "dual") {
    syncTarget = configuredTarget
      ? parseProvider(configuredTarget, opposite(configuredPrimary))
      : opposite(configuredPrimary);
    if (syncTarget === configuredPrimary) {
      throw new Error("TUSAN_DATA_SYNC_TARGET must be different from TUSAN_DATA_PRIMARY.");
    }
  } else if (configuredTarget && configuredTarget !== "none") {
    throw new Error("TUSAN_DATA_SYNC_TARGET is available only when TUSAN_DATA_MODE=dual.");
  }

  const makeDomain = (domain: DataDomain): DomainDataRuntime => {
    const key = domain === "blogAdmin"
      ? "TUSAN_DATA_PROVIDER_BLOG_ADMIN"
      : "TUSAN_DATA_PROVIDER_ANNOUNCEMENTS";
    const primary = parseProvider(env[key], configuredPrimary);
    if (mode !== "dual" && primary !== configuredPrimary) {
      throw new Error(`${key} can differ from the global provider only in dual mode.`);
    }
    return {
      mode,
      primary,
      syncTarget: mode === "dual" ? opposite(primary) : null,
    };
  };

  return {
    mode,
    domains: {
      blogAdmin: makeDomain("blogAdmin"),
      announcements: makeDomain("announcements"),
    },
  };
}

export function assertProviderConfigured(provider: DataProvider, env: RuntimeEnvironment = process.env): void {
  if (provider === "supabase") {
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase data provider requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    return;
  }

  for (const key of ["MYSQL_HOST", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE"] as const) {
    if (!env[key]) throw new Error(`MySQL data provider is missing ${key}.`);
  }
  if (env.MYSQL_DATABASE === "tusancni_main" && env.MYSQL_ALLOW_PRODUCTION !== "1") {
    throw new Error("Production MySQL access is disabled. Set MYSQL_ALLOW_PRODUCTION=1 only for an approved production deployment.");
  }
}

export function getDomainDataRuntime(domain: DataDomain): DomainDataRuntime {
  return resolveDataRuntime().domains[domain];
}
