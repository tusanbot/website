import type { ReactNode } from "react";

export type ServiceSeoFaq = {
  question: string;
  answer: string;
};

export type ServiceSeoContentData = {
  intro?: string | null;
  body?: string | null;
  steps?: string[] | null;
  requirements?: string[] | null;
  notes?: string[] | null;
  faq?: ServiceSeoFaq[] | null;
};

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function normalizeServiceSeoContent(value: unknown): ServiceSeoContentData {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return normalizeServiceSeoContent(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const data = value as Record<string, unknown>;
  const faq = Array.isArray(data.faq)
    ? data.faq
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({ question: String(item.question ?? "").trim(), answer: String(item.answer ?? "").trim() }))
        .filter((item) => item.question && item.answer)
    : [];
  return {
    intro: typeof data.intro === "string" ? data.intro.trim() || null : null,
    body: typeof data.body === "string" ? data.body.trim() || null : null,
    steps: cleanList(data.steps),
    requirements: cleanList(data.requirements),
    notes: cleanList(data.notes),
    faq,
  };
}

export function getServiceSeoFaqSchema(value: unknown) {
  const content = normalizeServiceSeoContent(value);
  if (!content.faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function ServiceSeoContent({ content }: { content: unknown }) {
  const data = normalizeServiceSeoContent(content);
  const hasContent = !!(data.intro || data.body || data.steps?.length || data.requirements?.length || data.notes?.length || data.faq?.length);
  if (!hasContent) return null;

  return (
    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-6 leading-8 text-[var(--text-secondary)]">
      {data.intro && <p className="text-base">{data.intro}</p>}
      {data.body && <div className="mt-4 whitespace-pre-line">{data.body}</div>}
      {data.steps?.length ? <Section title="مراحل انجام خدمت"><ol className="list-decimal pr-6 space-y-2">{data.steps.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ol></Section> : null}
      {data.requirements?.length ? <Section title="مدارک و اطلاعات موردنیاز"><ul className="list-disc pr-6 space-y-2">{data.requirements.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ul></Section> : null}
      {data.notes?.length ? <Section title="نکات مهم"><ul className="list-disc pr-6 space-y-2">{data.notes.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ul></Section> : null}
      {data.faq?.length ? <Section title="سوالات متداول"><div className="space-y-4">{data.faq.map((item, i) => <div key={`${i}-${item.question}`}><h3 className="font-bold text-[var(--text-primary)]">{item.question}</h3><p className="mt-1">{item.answer}</p></div>)}</div></Section> : null}
    </div>
  );
}
