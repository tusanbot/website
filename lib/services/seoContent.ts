export type ServiceSeoFaq = {
  question: string;
  answer: string;
};

export type ServiceSeoContentData = {
  intro: string;
  body: string;
  steps: string[];
  requirements: string[];
  notes: string[];
  faq: ServiceSeoFaq[];
};
