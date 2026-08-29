export type ServiceSeoFaq = {
  question: string;
  answer: string;
};

export type ServiceSeoContentData = {
  intro?: string;
  body?: string;
  steps?: string[];
  requirements?: string[];
  notes?: string[];
  faq?: ServiceSeoFaq[];
};

export function normalizeServiceSeoContent(value: unknown): ServiceSeoContentData | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;

  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = (v: unknown) =>
    Array.isArray(v) ? v.map(text).filter(Boolean) : [];

  const faq = Array.isArray(input.faq)
    ? input.faq
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const question = text(row.question);
          const answer = text(row.answer);
          return question && answer ? { question, answer } : null;
        })
        .filter((item): item is ServiceSeoFaq => Boolean(item))
    : [];

  const result: ServiceSeoContentData = {
    intro: text(input.intro) || undefined,
    body: text(input.body) || undefined,
    steps: list(input.steps),
    requirements: list(input.requirements),
    notes: list(input.notes),
    faq,
  };

  return result.intro || result.body || result.steps?.length || result.requirements?.length || result.notes?.length || result.faq?.length
    ? result
    : null;
}
