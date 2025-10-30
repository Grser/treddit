"use client";

import { useLocale, type LocaleStrings } from "@/contexts/LocaleContext";

type PageKey = keyof LocaleStrings["pages"];

export default function PageHero({ page }: { page: PageKey }) {
  const { strings } = useLocale();
  const content = strings.pages[page];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
      <p className="text-lg opacity-80 leading-relaxed">{content.description}</p>
    </main>
  );
}
