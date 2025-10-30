"use client";

import { useLocale } from "@/contexts/LocaleContext";

export default function AuthBanner() {
  const { strings } = useLocale();
  const t = strings.authBanner;

  return (
    <div className="border border-border bg-surface rounded-xl p-4">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="text-sm opacity-80 mt-1">{t.description}</p>
      <div className="mt-3 flex gap-2">
        <a
          href="/auth/registrar"
          className="h-9 px-4 rounded-full bg-brand text-white text-sm inline-flex items-center"
        >
          {t.register}
        </a>
        <a
          href="/auth/login"
          className="h-9 px-4 rounded-full border border-border text-sm inline-flex items-center"
        >
          {t.login}
        </a>
      </div>
    </div>
  );
}
