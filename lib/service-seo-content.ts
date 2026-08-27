export type ServiceSeoStep = { title: string; description: string };
export type ServiceSeoFaq = { question: string; answer: string };
export type ServiceSeoContent = {
  introduction?: string;
  audience?: string;
  steps?: ServiceSeoStep[];
  tips?: string[];
  faq?: ServiceSeoFaq[];
};

export function normalizeServiceSeoContent(value: unknown): ServiceSeoContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const steps = Array.isArray(input.steps)
    ? input.steps
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({ title: String(item.title ?? "").trim(), description: String(item.description ?? "").trim() }))
        .filter((item) => item.title || item.description)
    : [];
  const tips = Array.isArray(input.tips) ? input.tips.map(String).map((x) => x.trim()).filter(Boolean) : [];
  const faq = Array.isArray(input.faq)
    ? input.faq
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({ question: String(item.question ?? "").trim(), answer: String(item.answer ?? "").trim() }))
        .filter((item) => item.question || item.answer)
    : [];
  return {
    introduction: typeof input.introduction === "string" ? input.introduction.trim() : "",
    audience: typeof input.audience === "string" ? input.audience.trim() : "",
    steps,
    tips,
    faq,
  };
}
