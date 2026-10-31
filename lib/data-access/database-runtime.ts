import "server-only";

export type DataProvider = "supabase" | "mysql";
export type DataMode = DataProvider | "dual";
export type DataDomain = "blogAdmin" | "announcements";

export type DomainDataRuntime = {
  mode: DataMode;
  primary: DataProvider;
  availableProviders: DataProvider[];
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

/**
 * Resolves server-side data routing without opening either database connection.
 * In dual mode both providers are available, but each domain is routed to one
 * provider. Replication is a separate outbox concern and is not implied here.
 */
export function resolveDataRuntime(env: RuntimeEnvironment = process.env): DataRuntime {
  const mode = parseMode(env.TUSAN_DATA_MODE);
  const defaultPrimary: DataProvider = mode === "mysql" ? "mysql" : "supabase";
  const configuredPrimary = mode === "dual"
    ? parseProvider(env.TUSAN_DATA_PRIMARY, defaultPrimary)
    : defaultPrimary;

  // Dual mode makes both providers available for independent domain routing.
  // It does not turn on replication or unsafe dual writes.
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
      availableProviders: mode === "dual" ? ["supabase", "mysql"] : [primary],
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
